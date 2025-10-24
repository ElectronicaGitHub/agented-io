import fs from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';
import { TextContentBlock } from 'openai/resources/beta/threads/messages';
import { IEmbeddingConnector, ILLMResultResponse, ISimpleLLMConnector, IEnvOptions } from '../interfaces';

export class OpenAIConnector implements ISimpleLLMConnector, IEmbeddingConnector {
  private client: OpenAI;
  private systemPrompt: string | null = null;

  constructor(
    private assistantId: string,
    private envConfig: Required<IEnvOptions>,
  ) {
    this.client = new OpenAI({
      apiKey: this.envConfig.OPENAI_KEY,
    });
  }

  async sendChatMessage(prompt: string, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    const actualModel = model || this.envConfig.OPENAI_MODEL;
    try {
      const response = await this.client.chat.completions.create({
        model: actualModel,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, { signal });
      const result = response.choices[0].message.content;
      return { result: result as string };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      console.error('Error calling OpenAI:', error);
      return { error: 'Error calling OpenAI' };
    }
  } 

  async createChatCompletion(content: string, systemPromptFilename: string, signal?: AbortSignal): Promise<ILLMResultResponse> {
    console.log('createChatCompletion', this.assistantId);
    const contentLength = content.length;

    await this.loadSystemPrompt(systemPromptFilename);
    if (this.systemPrompt) {
      await this.updateAssistantPrompt(this.assistantId, this.systemPrompt);
    }

    const { threads } = this.client.beta;

    console.log('Creating thread');
    const thread = await threads.create({ signal });
    await threads.messages.create(thread.id, {
      role: 'user',
      content,
    }, { signal });

    const run = await threads.runs.createAndPoll(thread.id, {
      assistant_id: this.assistantId,
    }, { signal });

    if (run.last_error) {
      return {
        error: `${run.last_error.code}: ${run.last_error.message}`,
      };
    }

    if (run.status === 'completed') {
      const messagesResponse = await threads.messages.list(thread.id, { signal });
      const textBlock = messagesResponse.data[0].content[0] as TextContentBlock;

      try {
        const text = textBlock.text.value.trim();
        return { result: text };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return { error: 'Request aborted' };
        }
        console.error('Error parsing JSON', textBlock.text.value);
        return {
          error: 'Error parsing JSON',
        };
      }
    } else {
      console.log('Run is not completed', run.status);
      return {
        error: 'Run is not completed',
      };
    }
  }

  async updateAssistantPrompt(assistantId: string, newPrompt: string): Promise<void> {
    try {
      await this.client.beta.assistants.update(assistantId, {
        instructions: newPrompt,
      });
      console.log(`Assistant ${assistantId} prompt updated successfully`);
    } catch (error: any) {
      console.error(`Error updating assistant ${assistantId} prompt:`, error.message);
      throw error;
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

  async getEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.envConfig.OPENAI_EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw error;
    }
  }
}