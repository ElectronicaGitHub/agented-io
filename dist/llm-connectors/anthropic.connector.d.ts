import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt } from '../interfaces';
export declare class AnthropicConnector implements ISimpleLLMConnector {
    private client;
    private systemPrompt;
    private maxRetries;
    private retryDelay;
    constructor();
    sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse>;
    private loadSystemPrompt;
    private delay;
    createChatCompletion(userPrompt: string, systemPromptFilename: string, signal?: AbortSignal): Promise<ILLMResultResponse>;
}
