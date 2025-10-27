import { OpenAI } from 'openai';
import { IEmbeddingConnector, ILLMResultResponse, ISimpleLLMConnector, IEnvOptions } from '../interfaces';

export class OpenAIConnector implements ISimpleLLMConnector, IEmbeddingConnector {
  private client: OpenAI;
  private getEnvConfig: () => Required<IEnvOptions>;

  constructor(
    getEnvConfig: () => Required<IEnvOptions>,
  ) {
    this.getEnvConfig = getEnvConfig;
    const envConfig = this.getEnvConfig();
    this.client = new OpenAI({
      apiKey: envConfig.OPENAI_KEY,
    });
  }

  async sendChatMessage(prompt: string, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const envConfig = this.getEnvConfig();
    const actualModel = model || envConfig.OPENAI_MODEL;
    try {
      const response = await this.client.chat.completions.create({
        model: actualModel,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, { signal });
      const result = response.choices[0].message.content;
      return { result: result as string };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      
      // Extract HTTP status from error if available
      const httpStatus = error?.status || error?.response?.status;
      console.error('Error calling OpenAI:', error, 'Status:', httpStatus);
      
      return { 
        error: 'Error calling OpenAI',
        httpStatus: httpStatus
      };
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    try {
      const envConfig = this.getEnvConfig();
      const response = await this.client.embeddings.create({
        model: envConfig.OPENAI_EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw error;
    }
  }
}