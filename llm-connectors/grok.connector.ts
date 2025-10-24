import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class GrokConnector implements ISimpleLLMConnector {
  private client: OpenAI;
  private systemPrompt: string | null = null;

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

  private async loadSystemPrompt(systemPromptFilename: string): Promise<void> {
    try {
      const filePath = path.join(systemPromptFilename);
      this.systemPrompt = await fs.readFile(filePath, 'utf-8');
      console.log('System prompt loaded successfully');
      console.log(`System prompt length: ${this.systemPrompt.length} characters`);
    } catch (error) {
      console.error('Error loading system prompt:', error);
      this.systemPrompt = null;
    }
  }

  async createChatCompletion(prompt: string, systemPromptFilename: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    console.log('[GrokConnector.createChatCompletion] Starting chat completion');
    
    await this.loadSystemPrompt(systemPromptFilename);
    const messages: ChatMessage[] = [];

    if (this.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    try {
      const response = await this.client.chat.completions.create({
        model: this.envConfig.GROK_MODEL,
        messages: messages
      }, { signal });

      const result = response.choices[0].message.content;
      console.log(`[GrokConnector.createChatCompletion] Got response of length ${result?.length || 0}`);
      return { result: result as string };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      console.error('Error in Grok chat completion:', error.message);
      return { error: 'Error in Grok chat completion' };
    }
  }
}
