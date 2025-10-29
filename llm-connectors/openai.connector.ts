import { OpenAI } from 'openai';
import { IEmbeddingConnector, ILLMResultResponse, ISimpleLLMConnector, IEnvOptions, ISplitPrompt } from '../interfaces';

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

  async sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const envConfig = this.getEnvConfig();
    const actualModel = model || envConfig.OPENAI_MODEL;
    this.client.apiKey = envConfig.OPENAI_KEY;
    
    try {
      const response = await this.client.chat.completions.create({
        model: actualModel,
        messages: typeof prompt === 'string' ? [{
          role: 'user',
          content: prompt
        }] : [
          { role: 'system', content: prompt.cacheable },
          { role: 'user', content: prompt.nonCacheable }
        ],
      }, { signal });

      console.log('[OpenAI Connector] response.usage', response.usage);

      const result = response.choices[0].message.content;

      // Extract usage metadata
      const usage = response.usage;
      const totalSymbols = typeof prompt === 'string' ? prompt.length : prompt.cacheable.length + prompt.nonCacheable.length;
      const cachedTokens = usage?.prompt_tokens_details?.cached_tokens ?? 0;
      const inputTokens = usage?.prompt_tokens ?? 0;
      const metadata = {
        inputTokens,
        outputTokens: usage?.completion_tokens ?? 0,
        cachedTokens,
        nonCachedTokens: inputTokens - cachedTokens,
        modelUsed: response.model || actualModel,
        symbolPerToken: inputTokens > 0 ? totalSymbols / inputTokens : undefined,
        providerRawUsage: usage
      };

      return { result: result as string, metadata };
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