import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

export class AnthropicConnector implements ISimpleLLMConnector {
  private client: Anthropic;
  private model: string;

  constructor(private envConfig: Required<IEnvOptions>) {
    this.client = new Anthropic({
      apiKey: this.envConfig.ANTHROPIC_API_KEY,
    });
    this.model = this.envConfig.ANTHROPIC_MODEL;
  }

  async sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const actualModel = model || this.model;
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
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      console.error('Error calling Anthropic:', error);
      return { error: 'Error calling Anthropic' };
    }
  }

}