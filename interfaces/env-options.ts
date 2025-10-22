import { ELLMProvider } from '../consts';

export interface IEnvOptions {
  // API Keys
  ANTHROPIC_API_KEY?: string;
  OPENAI_KEY?: string;
  OPENAI_ASSISTANT_VALVE_ID?: string;
  DEEPSEEK_KEY?: string;
  
  // LLM Models
  ANTHROPIC_MODEL?: string;
  
  // LLM Providers
  LLM_PROVIDER?: ELLMProvider;
  FAST_REQUEST_LLM_PROVIDER?: ELLMProvider;
  
  // LLM Settings
  MAX_NUMBER_OF_TRIES_IN_FLOW?: number;
  LLM_RESULT_TIMEOUT_MS?: number;
  
  // LLM Connectors Substitute
  LLM_CONNECTORS_SUBSTITUTE_OPENAI?: ELLMProvider;
  LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC?: ELLMProvider;
  LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK?: ELLMProvider;
  
  // Agent Settings
  IS_USE_SCHEDULED_REFLECTION?: boolean;
  DEFAULT_WORK_TIMEOUT?: number;
  DEFAULT_PING_INTERVAL?: number;
  MAX_RETRY_COUNT?: number;
  RETRY_BACKOFF_MULTIPLIER?: number;
}
