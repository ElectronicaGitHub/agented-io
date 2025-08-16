import { IEmbeddingConnector, ILLMResultResponse, ISimpleLLMConnector } from '../interfaces';
export declare class OpenAIConnector implements ISimpleLLMConnector, IEmbeddingConnector {
    private assistantId;
    private client;
    private systemPrompt;
    constructor(assistantId: string);
    sendChatMessage(prompt: string, model?: string, signal?: AbortSignal): Promise<ILLMResultResponse>;
    createChatCompletion(content: string, systemPromptFilename: string, signal?: AbortSignal): Promise<ILLMResultResponse>;
    updateAssistantPrompt(assistantId: string, newPrompt: string): Promise<void>;
    private loadSystemPrompt;
    getEmbeddings(text: string): Promise<number[]>;
}
