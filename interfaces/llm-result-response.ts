export interface ILLMResultResponse {
  result?: string; 
  error?: string;
  httpStatus?: number;
  metadata?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}