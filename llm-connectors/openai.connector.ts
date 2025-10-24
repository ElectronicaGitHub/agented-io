import { OpenAI } from 'openai';
import { IEmbeddingConnector, ILLMResultResponse, ISimpleLLMConnector, IEnvOptions } from '../interfaces';

export class OpenAIConnector implements ISimpleLLMConnector, IEmbeddingConnector {
  private client: OpenAI;

  constructor(
    private envConfig: Required<IEnvOptions>,
  ) {
    this.client = new OpenAI({
      apiKey: this.envConfig.OPENAI_KEY,
    });
  }

  async sendChatMessage(prompt: string, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const actualModel = model || this.envConfig.OPENAI_MODEL;
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      console.error('Error calling OpenAI:', error);
      return { error: 'Error calling OpenAI' };
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.envConfig.OPENAI_EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw error;
    }
  }
}