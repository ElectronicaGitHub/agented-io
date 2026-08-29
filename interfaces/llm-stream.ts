import { ELLMProvider } from '../consts';

export type LLMStreamPhase = 'start' | 'delta' | 'reset' | 'end' | 'error';

export interface ILLMStreamEvent {
  phase: LLMStreamPhase;
  streamId: string;
  attemptId: string;
  provider: ELLMProvider;
  model?: string;
  delta?: string;
  error?: string;
}

export interface ILLMStreamOptions {
  streamId: string;
  onEvent?: (event: ILLMStreamEvent) => void;
}

export type ILLMChunkHandler = (delta: string) => void;
