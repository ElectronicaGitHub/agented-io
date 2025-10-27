import OpenAI from 'openai';
import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

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

  async sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const envConfig = this.getEnvConfig();
    const actualModel = model || envConfig.DEEPSEEK_MODEL;
    this.client.apiKey = envConfig.DEEPSEEK_KEY;
    
    if (typeof prompt === 'string') {
      console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${actualModel}`, prompt.length);
    } else {
      console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${actualModel}`, prompt.cacheable.length, prompt.nonCacheable.length);
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
      console.log('[DeepSeek Connector] response.usage', response.usage);
      
      const result = response.choices[0].message.content;
      return { result: result as string };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      
      // Extract HTTP status from error if available
      const httpStatus = error?.status || error?.response?.status;
      console.error('Error calling DeepSeek:', error.message, 'Status:', httpStatus);
      
      return { 
        error: 'Error calling DeepSeek',
        httpStatus: httpStatus
      };
    }
  }
}