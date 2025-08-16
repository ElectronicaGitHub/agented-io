import { ILLMResultResponse, ISimpleLLMConnector, ISplitPrompt } from '../interfaces';
export declare class DeepSeekConnector implements ISimpleLLMConnector {
    private client;
    private systemPrompt;
    constructor();
    sendChatMessage(prompt: string | ISplitPrompt, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse>;
    private loadSystemPrompt;
    createChatCompletion(prompt: string, systemPromptFilename: string, signal?: AbortSignal): Promise<ILLMResultResponse>;
}
