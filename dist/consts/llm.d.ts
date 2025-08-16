export declare const OPENAI_MODEL = "gpt-4o";
export declare const ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";
export declare const DEEPSEEK_MODEL = "deepseek-chat";
export declare const ANTHROPIC_MAX_RETRIES = 3;
export declare const ANTHROPIC_DELAY_MS = 1000;
export declare const PROMPT_LAST_MESSAGES_N = 15;
export declare enum ELLMProvider {
    OpenAI = "OpenAI",
    Anthropic = "Anthropic",
    OpenRouter = "OpenRouter",
    DeepSeek = "DeepSeek"
}
export declare const LLM_PROVIDER: ELLMProvider;
export declare const FAST_REQUEST_LLM_PROVIDER: ELLMProvider;
export declare const MAX_NUMBER_OF_TRIES_IN_FLOW: number;
export declare const OPENAI_EMBEDDING_MODEL = "text-embedding-ada-002";
export declare const LLM_RESULT_TIMEOUT_MS: number;
export declare const LLM_CONNECTORS_SUBSTITUTE: {
    OpenAI: ELLMProvider[];
    Anthropic: ELLMProvider[];
    DeepSeek: ELLMProvider[];
};
