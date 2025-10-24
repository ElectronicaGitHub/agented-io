import { ISplitPrompt } from './agent-split-prompt';
import { ILLMResultResponse } from './llm-result-response';

export interface ISimpleLLMConnector {
  sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse>;
}

export interface IEmbeddingConnector {
  getEmbeddings(text: string): Promise<number[]>;
}
