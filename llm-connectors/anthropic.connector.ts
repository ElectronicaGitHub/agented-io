import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

export class AnthropicConnector implements ISimpleLLMConnector {
  private client: Anthropic;
  private systemPrompt: string | null = null;
  private maxRetries: number;
  private retryDelay: number;
  private model: string;

  constructor(private envConfig: Required<IEnvOptions>) {
    this.client = new Anthropic({
      apiKey: this.envConfig.ANTHROPIC_API_KEY,
    });
    this.model = this.envConfig.ANTHROPIC_MODEL;
    this.maxRetries = this.envConfig.LLM_MAX_RETRIES;
    this.retryDelay = this.envConfig.LLM_RETRY_DELAY_MS;
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

  private async loadSystemPrompt(systemPromptFilename: string): Promise<void> {
    try {
      const filePath = path.join(systemPromptFilename);
      this.systemPrompt = await fs.readFile(filePath, 'utf-8');
      console.log('System prompt loaded successfully');
      console.log(`System prompt length: ${this.systemPrompt.length} characters`);
    } catch (error) {
      console.error('Error loading system prompt:', error);
      throw error;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async createChatCompletion(userPrompt: string, systemPromptFilename: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    await this.loadSystemPrompt(systemPromptFilename);

    if (!this.systemPrompt) {
      return { error: 'Failed to load system prompt' };
    }

    console.log(`User prompt length: ${userPrompt.length} characters`);

    let currentDelay = this.retryDelay;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Calling Anthropic API (Attempt ${attempt})`);
        
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 4000,
          system: [
            {
              type: 'text',
              text: this.systemPrompt,
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: [{ role: 'user', content: userPrompt }],
        }, { signal });
        
        console.log('Calling Anthropic API finished');

        const textResult = (response.content[0] as TextBlock).text;
        console.log(`Response length: ${textResult.length} characters`);

        // Log cache performance metrics if available
        if ('cache_creation_input_tokens' in response && 'cache_read_input_tokens' in response) {
          console.log(`[Anthropic Connector] Cache creation tokens: ${response.cache_creation_input_tokens}`);
          console.log(`[Anthropic Connector] Cache read tokens: ${response.cache_read_input_tokens}`);
        }

        return { result: textResult };
      } catch (error: any) {
        if (error instanceof Error && error.name === 'AbortError') {
          return { error: 'Request aborted' };
        }
        
        console.error(`Error calling Anthropic (Attempt ${attempt}):`, error.message);
        
        // Check for specific error types that warrant retry
        const shouldRetry = error.message.includes('Overloaded') || 
                           error.message.includes('rate_limit') ||
                           error.message.includes('timeout') ||
                           (error.status >= 500 && error.status < 600);
        
        if (shouldRetry && attempt < this.maxRetries) {
          console.log(`Retrying in ${currentDelay / 1000} seconds...`);
          await this.delay(currentDelay);
          // Exponential backoff with max delay cap
          currentDelay = Math.min(currentDelay * 2, 30000); // Max 30 seconds
        } else {
          return { error: `Error calling Anthropic API: ${error.message}` };
        }
      }
    }

    return { error: 'Max retries reached. Failed to call Anthropic API.' };
  }
}