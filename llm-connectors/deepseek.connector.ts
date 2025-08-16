import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { DEEPSEEK_KEY, DEEPSEEK_MODEL } from '../consts';
import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt } from '../interfaces';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class DeepSeekConnector implements ISimpleLLMConnector {
  private client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: DEEPSEEK_KEY,
  });
  private systemPrompt: string | null = null;

  constructor() {}

  async sendChatMessage(prompt: string | ISplitPrompt, model: string = DEEPSEEK_MODEL, signal?: AbortSignal): Promise<ILLMResultResponse> {
    
    if (typeof prompt === 'string') {
      console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${model}`, prompt.length);
    } else {
      console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${model}`, prompt.cacheable.length, prompt.nonCacheable.length);
    }
    
    try {
      let response: any;
      if (typeof prompt === 'string') {
        response = await this.client.chat.completions.create({
          model: model,
          messages: [{
            role: 'user',
            content: prompt
          }]
        }, { signal });
      } else {
        response = await this.client.chat.completions.create({
          model: model,
          messages: [
            { role: 'system', content: prompt.cacheable },
            { role: 'user', content: prompt.nonCacheable }
          ],
        }, { signal });
      }
      console.log('[Anthropic Connector] response.usage', response.usage);
      
      const result = response.choices[0].message.content;
      return { result: result as string };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      console.error('Error calling DeepSeek:', error.message);
      return { error: 'Error calling DeepSeek' };
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
    console.log('[DeepSeekConnector.createChatCompletion] Starting chat completion');
    
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
        model: DEEPSEEK_MODEL,
        messages: messages
      }, { signal });

      const result = response.choices[0].message.content;
      console.log(`[DeepSeekConnector.createChatCompletion] Got response of length ${result?.length || 0}`);
      return { result: result as string };
    } catch (error: any) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      console.error('Error in DeepSeek chat completion:', error.message);
      return { error: 'Error in DeepSeek chat completion' };
    }
  }
}