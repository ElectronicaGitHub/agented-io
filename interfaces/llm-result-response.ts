import { ILLMUsageMetadata } from './agent-message';

export interface ILLMResultResponse {
  result?: string; 
  error?: string;
  httpStatus?: number;
  metadata?: ILLMUsageMetadata;
}