export const OPENAI_MODEL = 'gpt-4o';
// export const OPENAI_MODEL = 'gpt-4o-mini';
export const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514') as string;
export const DEEPSEEK_MODEL = 'deepseek-chat';
export const GROK_MODEL = 'grok-beta';

export const ANTHROPIC_MAX_RETRIES = 3;
export const ANTHROPIC_DELAY_MS = 1000;

export const PROMPT_LAST_MESSAGES_N = 15;

export enum ELLMProvider {
  OpenAI = 'OpenAI',
  Anthropic = 'Anthropic',
  OpenRouter = 'OpenRouter',
  DeepSeek = 'DeepSeek',
  Grok = 'Grok',
}

export const LLM_PROVIDER = (process.env.LLM_PROVIDER || ELLMProvider.Anthropic) as ELLMProvider;
export const FAST_REQUEST_LLM_PROVIDER = (process.env.FAST_REQUEST_LLM_PROVIDER || ELLMProvider.DeepSeek) as ELLMProvider;

export const MAX_NUMBER_OF_TRIES_IN_FLOW = Number(process.env.MAX_NUMBER_OF_TRIES_IN_FLOW || 5);

// export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';

export const LLM_RESULT_TIMEOUT_MS = Number(process.env.LLM_RESULT_TIMEOUT_MS || 30000);

export const LLM_CONNECTORS_SUBSTITUTE = {
  [ELLMProvider.OpenAI]: [(process.env.LLM_CONNECTORS_SUBSTITUTE_OPENAI || ELLMProvider.Anthropic)] as ELLMProvider[],
  [ELLMProvider.Anthropic]: [(process.env.LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC || ELLMProvider.DeepSeek)] as ELLMProvider[],
  [ELLMProvider.DeepSeek]: [(process.env.LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK || ELLMProvider.OpenAI)] as ELLMProvider[],
  [ELLMProvider.Grok]: [(process.env.LLM_CONNECTORS_SUBSTITUTE_GROK || ELLMProvider.Anthropic)] as ELLMProvider[],
}