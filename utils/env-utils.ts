import { ELLMProvider } from '../consts';
import { IEnvOptions } from '../interfaces/env-options';

/**
 * Gets environment configuration value with fallback logic:
 * 1. If envOptions has the value, use it
 * 2. Otherwise, use process.env
 * 3. If neither exists, use the provided default value
 */
export function getEnvValue<T>(
  key: keyof IEnvOptions,
  envOptions?: IEnvOptions,
  defaultValue?: T
): T {
  // First check if envOptions has the value
  if (envOptions && envOptions[key] !== undefined) {
    return envOptions[key] as T;
  }
  
  // Then check process.env
  const envValue = process.env[key];
  if (envValue !== undefined) {
    return envValue as T;
  }
  
  // Finally use default value
  return defaultValue as T;
}

/**
 * Gets all environment configuration with fallback to process.env
 */
export function getEnvConfig(envOptions?: IEnvOptions): Required<IEnvOptions> {
  return {
    // API Keys
    ANTHROPIC_API_KEY: getEnvValue('ANTHROPIC_API_KEY', envOptions, ''),
    OPENAI_KEY: getEnvValue('OPENAI_KEY', envOptions, ''),
    OPENAI_ASSISTANT_VALVE_ID: getEnvValue('OPENAI_ASSISTANT_VALVE_ID', envOptions, ''),
    DEEPSEEK_KEY: getEnvValue('DEEPSEEK_KEY', envOptions, ''),
    GROK_KEY: getEnvValue('GROK_KEY', envOptions, ''),
    
    // LLM Models
    ANTHROPIC_MODEL: getEnvValue('ANTHROPIC_MODEL', envOptions, 'claude-sonnet-4-20250514'),
    
    // LLM Providers
    LLM_PROVIDER: getEnvValue('LLM_PROVIDER', envOptions, ELLMProvider.Anthropic),
    FAST_REQUEST_LLM_PROVIDER: getEnvValue('FAST_REQUEST_LLM_PROVIDER', envOptions, ELLMProvider.DeepSeek),
    
    // LLM Settings
    MAX_NUMBER_OF_TRIES_IN_FLOW: getEnvValue('MAX_NUMBER_OF_TRIES_IN_FLOW', envOptions, 5),
    LLM_RESULT_TIMEOUT_MS: getEnvValue('LLM_RESULT_TIMEOUT_MS', envOptions, 30000),
    
    // LLM Connectors Substitute
    LLM_CONNECTORS_SUBSTITUTE_OPENAI: getEnvValue('LLM_CONNECTORS_SUBSTITUTE_OPENAI', envOptions, ELLMProvider.Anthropic),
    LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC: getEnvValue('LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC', envOptions, ELLMProvider.DeepSeek),
    LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK: getEnvValue('LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK', envOptions, ELLMProvider.OpenAI),
    LLM_CONNECTORS_SUBSTITUTE_GROK: getEnvValue('LLM_CONNECTORS_SUBSTITUTE_GROK', envOptions, ELLMProvider.Anthropic),
    
    // Agent Settings
    IS_USE_SCHEDULED_REFLECTION: getEnvValue('IS_USE_SCHEDULED_REFLECTION', envOptions, false),
    DEFAULT_WORK_TIMEOUT: getEnvValue('DEFAULT_WORK_TIMEOUT', envOptions, 60000),
    DEFAULT_PING_INTERVAL: getEnvValue('DEFAULT_PING_INTERVAL', envOptions, 10000),
    MAX_RETRY_COUNT: getEnvValue('MAX_RETRY_COUNT', envOptions, 3),
    RETRY_BACKOFF_MULTIPLIER: getEnvValue('RETRY_BACKOFF_MULTIPLIER', envOptions, 1.5),
    
    // Debug Settings
    LOG_PROMPT: getEnvValue('LOG_PROMPT', envOptions, false),
    LOG_RESPONSE: getEnvValue('LOG_RESPONSE', envOptions, false),
  };
}
