import { ELLMProvider } from '../consts';
import { ISplitPrompt } from '../interfaces';
export declare class LLMProcessor {
    #private;
    private connectors;
    private lastWorkingProvider;
    constructor();
    sendMessage(text: string | ISplitPrompt, provider?: ELLMProvider, model?: string, signal?: AbortSignal): Promise<{
        result: string;
        metadata: {
            inputTokens: number;
            outputTokens: number;
        };
    }>;
    getLLMResultSendMessage(message: string | ISplitPrompt, allowString?: boolean): Promise<{
        result: any;
        metadata: {
            inputTokens: number;
            outputTokens: number;
        };
    }>;
    private tryMultipleProvidersSendMessage;
    private tryLLMProviderSendMessage;
}
