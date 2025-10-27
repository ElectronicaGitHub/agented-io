import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

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

  async sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const envConfig = this.getEnvConfig();
    const actualModel = model || envConfig.ANTHROPIC_MODEL;
    this.client.apiKey = envConfig.ANTHROPIC_API_KEY;
    
    if (typeof prompt === 'string') {
      console.log('[Anthropic Connector] prompt length', prompt.length);
    } else {
      console.log('[Anthropic Connector] split prompt', prompt.cacheable.length, prompt.nonCacheable.length);
    }
    try {
      let response: any;
      if (typeof prompt === 'string') {
        response = await this.client.messages.create({
          model: actualModel,
          max_tokens: 4000,
          system: [
            {
              type: 'text',
              text: prompt,
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: [{ role: 'user', content: prompt }],
        }, { signal });
      } else {
        response = await this.client.messages.create({
          model: actualModel,
          max_tokens: 4000,
          system: [
            {
              type: 'text',
              text: prompt.cacheable,
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: [{ role: 'user', content: prompt.nonCacheable }],
        }, { signal });
      }
      console.log('[Anthropic Connector] response.usage', response.usage);
      
      const textResult = (response.content[0] as TextBlock).text;
      return { result: textResult };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      
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