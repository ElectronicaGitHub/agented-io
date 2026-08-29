import OpenAI from 'openai';
import { ILLMChunkHandler, ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

export class DeepSeekConnector implements ISimpleLLMConnector {
  private client: OpenAI;
  private getEnvConfig: () => Required<IEnvOptions>;

  constructor(getEnvConfig: () => Required<IEnvOptions>) {
    this.getEnvConfig = getEnvConfig;
    const envConfig = this.getEnvConfig();
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: envConfig.DEEPSEEK_KEY,
    });
  }

  async sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal, onChunk?: ILLMChunkHandler): Promise<ILLMResultResponse> {
    const envConfig = this.getEnvConfig();
    const actualModel = model || envConfig.DEEPSEEK_MODEL;
    this.client.apiKey = envConfig.DEEPSEEK_KEY;
    
    if (typeof prompt === 'string') {
      console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${actualModel}`, prompt.length);
    } else {
      console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${actualModel}`, prompt.cacheable.length, prompt.nonCacheable.length);
    }
    
    try {
      const messages: any[] = typeof prompt === 'string'
        ? [{ role: 'user', content: prompt }]
        : [
          { role: 'system', content: prompt.cacheable },
          { role: 'user', content: prompt.nonCacheable },
        ];

      if (onChunk) {
        const stream: any = await this.client.chat.completions.create({
          model: actualModel,
          messages,
          stream: true,
          stream_options: { include_usage: true },
        } as any, { signal });

        let result = '';
        let usage: any;
        let responseModel = actualModel;
        for await (const chunk of stream) {
          responseModel = chunk.model || responseModel;
          usage = chunk.usage || usage;
          const delta = chunk.choices?.[0]?.delta?.content || '';
          if (delta) {
            result += delta;
            onChunk(delta);
          }
        }

        return { result, metadata: this.buildMetadata(prompt, usage, responseModel) };
      }

      let response: any;
      if (typeof prompt === 'string') {
        response = await this.client.chat.completions.create({
          model: actualModel,
          messages,
        }, { signal });
      } else {
        response = await this.client.chat.completions.create({
          model: actualModel,
          messages,
        }, { signal });
      }
      console.log('[DeepSeek Connector] response.usage', response.usage);
      
      const result = response.choices[0].message.content;

      // Extract usage metadata
      const metadata = this.buildMetadata(prompt, response.usage, response.model || actualModel);

      return { result: result as string, metadata };
    } catch (error: any) {
      if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      
      // Extract HTTP status from error if available
      const httpStatus = error?.status || error?.response?.status;
      console.error('Error calling DeepSeek:', error.message, 'Status:', httpStatus);
      
      return { 
        error: 'Error calling DeepSeek',
        httpStatus: httpStatus
      };
    }
  }

  private buildMetadata(prompt: string | ISplitPrompt, usage: any, modelUsed: string) {
    const totalSymbols = typeof prompt === 'string' ? prompt.length : prompt.cacheable.length + prompt.nonCacheable.length;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const cachedTokens = usage?.prompt_cache_hit_tokens ?? 0;
    return {
      inputTokens,
      outputTokens: usage?.completion_tokens ?? 0,
      cachedTokens,
      nonCachedTokens: usage?.prompt_cache_miss_tokens ?? inputTokens - cachedTokens,
      modelUsed,
      symbolPerToken: inputTokens > 0 ? totalSymbols / inputTokens : undefined,
      providerRawUsage: usage,
    };
  }
}
