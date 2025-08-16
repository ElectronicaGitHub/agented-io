"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLM_CONNECTORS_SUBSTITUTE = exports.LLM_RESULT_TIMEOUT_MS = exports.OPENAI_EMBEDDING_MODEL = exports.MAX_NUMBER_OF_TRIES_IN_FLOW = exports.FAST_REQUEST_LLM_PROVIDER = exports.LLM_PROVIDER = exports.ELLMProvider = exports.PROMPT_LAST_MESSAGES_N = exports.ANTHROPIC_DELAY_MS = exports.ANTHROPIC_MAX_RETRIES = exports.DEEPSEEK_MODEL = exports.ANTHROPIC_MODEL = exports.OPENAI_MODEL = void 0;
exports.OPENAI_MODEL = 'gpt-4o';
// export const OPENAI_MODEL = 'gpt-4o-mini';
exports.ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest';
// export const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20240620';
exports.DEEPSEEK_MODEL = 'deepseek-chat';
exports.ANTHROPIC_MAX_RETRIES = 3;
exports.ANTHROPIC_DELAY_MS = 1000;
exports.PROMPT_LAST_MESSAGES_N = 15;
var ELLMProvider;
(function (ELLMProvider) {
    ELLMProvider["OpenAI"] = "OpenAI";
    ELLMProvider["Anthropic"] = "Anthropic";
    ELLMProvider["OpenRouter"] = "OpenRouter";
    ELLMProvider["DeepSeek"] = "DeepSeek";
})(ELLMProvider || (exports.ELLMProvider = ELLMProvider = {}));
exports.LLM_PROVIDER = (process.env.LLM_PROVIDER || ELLMProvider.Anthropic);
exports.FAST_REQUEST_LLM_PROVIDER = (process.env.FAST_REQUEST_LLM_PROVIDER || ELLMProvider.DeepSeek);
exports.MAX_NUMBER_OF_TRIES_IN_FLOW = Number(process.env.MAX_NUMBER_OF_TRIES_IN_FLOW || 5);
// export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
exports.OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';
exports.LLM_RESULT_TIMEOUT_MS = Number(process.env.LLM_RESULT_TIMEOUT_MS || 30000);
exports.LLM_CONNECTORS_SUBSTITUTE = {
    [ELLMProvider.OpenAI]: [(process.env.LLM_CONNECTORS_SUBSTITUTE_OPENAI || ELLMProvider.Anthropic)],
    [ELLMProvider.Anthropic]: [(process.env.LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC || ELLMProvider.DeepSeek)],
    [ELLMProvider.DeepSeek]: [(process.env.LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK || ELLMProvider.OpenAI)],
};
