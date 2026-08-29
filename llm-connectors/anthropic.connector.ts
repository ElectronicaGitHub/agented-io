import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { ILLMChunkHandler, ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

export class AnthropicConnector implements ISimpleLLMConnector {
  private client: Anthropic;
  private getEnvConfig: () => Required<IEnvOptions>;

  constructor(getEnvConfig: () => Required<IEnvOptions>) {
    this.getEnvConfig = getEnvConfig;
    const envConfig = this.getEnvConfig();
    this.client = new Anthropic({
      apiKey: envConfig.ANTHROPIC_API_KEY,
    });
  }

  async sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal, onChunk?: ILLMChunkHandler): Promise<ILLMResultResponse> {
    const envConfig = this.getEnvConfig();
    const actualModel = model || envConfig.ANTHROPIC_MODEL;
    this.client.apiKey = envConfig.ANTHROPIC_API_KEY;
    
    if (typeof prompt === 'string') {
      console.log('[Anthropic Connector] prompt length', prompt.length);
    } else {
      console.log('[Anthropic Connector] split prompt', prompt.cacheable.length, prompt.nonCacheable.length);
    }
    try {
      const request: any = typeof prompt === 'string'
        ? {
          model: actualModel,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }
        : {
          model: actualModel,
          max_tokens: 4000,
          system: [{ type: 'text', text: prompt.cacheable, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: prompt.nonCacheable }],
        };

      let response: any;
      if (onChunk) {
        const stream = this.client.messages.stream(request, { signal });
        stream.on('text', (delta: string) => onChunk(delta));
        response = await stream.finalMessage();
      } else {
        response = await this.client.messages.create(request, { signal });
      }
      console.log('[Anthropic Connector] response.usage', response.usage);
      
      const textResult = response.content
        .filter((block: any): block is TextBlock => block.type === 'text')
        .map((block: TextBlock) => block.text)
        .join('');

      // Extract usage metadata
      const usage = response.usage;
      const totalSymbols = typeof prompt === 'string' ? prompt.length : prompt.cacheable.length + prompt.nonCacheable.length;
      const inputTokens = (usage?.input_tokens ?? 0) + (usage?.cache_read_input_tokens ?? 0);
      const metadata = {
        inputTokens,
        outputTokens: usage?.output_tokens ?? 0,
        cachedTokens: usage?.cache_read_input_tokens ?? 0,
        nonCachedTokens: usage?.input_tokens ?? 0,
        modelUsed: response.model || actualModel,
        symbolPerToken: inputTokens > 0 ? totalSymbols / inputTokens : undefined,
        providerRawUsage: usage
      };

      return { result: textResult, metadata };
    } catch (error: any) {
      if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      
      // Extract HTTP status from error if available
      const httpStatus = error?.status || error?.response?.status;
      console.error('Error calling Anthropic:', error, 'Status:', httpStatus);
      
      return { 
        error: 'Error calling Anthropic',
        httpStatus: httpStatus
      };
    }
  }

}
