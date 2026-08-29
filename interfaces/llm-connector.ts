import { ISplitPrompt } from './agent-split-prompt';
import { ILLMResultResponse } from './llm-result-response';
import { ILLMChunkHandler } from './llm-stream';

export interface ISimpleLLMConnector {
  sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal, onChunk?: ILLMChunkHandler): Promise<ILLMResultResponse>;
}

export interface IEmbeddingConnector {
  getEmbeddings(text: string): Promise<number[]>;
}
