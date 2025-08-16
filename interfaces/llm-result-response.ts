export interface ILLMResultResponse {
  result?: string; 
  error?: string;
  metadata?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}