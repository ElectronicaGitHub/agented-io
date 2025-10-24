import OpenAI from 'openai';
import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

export class GrokConnector implements ISimpleLLMConnector {
  private client: OpenAI;

  constructor(private envConfig: Required<IEnvOptions>) {
    this.client = new OpenAI({
      baseURL: 'https://api.x.ai/v1',
      apiKey: this.envConfig.GROK_KEY,
    });
  }

  async sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const actualModel = model || this.envConfig.GROK_MODEL;
    
    if (typeof prompt === 'string') {
      console.log(`[GrokConnector.sendChatMessage] Sending request to ${actualModel}`, prompt.length);
    } else {
      console.log(`[GrokConnector.sendChatMessage] Sending request to ${actualModel}`, prompt.cacheable.length, prompt.nonCacheable.length);
    }
    
    try {
      let response: any;
      if (typeof prompt === 'string') {
        response = await this.client.chat.completions.create({
          model: actualModel,
          messages: [{
            role: 'user',
            content: prompt
          }]
        }, { signal });
      } else {
        response = await this.client.chat.completions.create({
          model: actualModel,
          messages: [
            { role: 'system', content: prompt.cacheable },
            { role: 'user', content: prompt.nonCacheable }
          ],
        }, { signal });
      }
      console.log('[Grok Connector] response.usage', response.usage);
      
      const result = response.choices[0].message.content;
      return { result: result as string };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      console.error('Error calling Grok:', error.message);
      return { error: 'Error calling Grok' };
    }
  }
}
