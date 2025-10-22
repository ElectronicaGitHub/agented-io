import { MainAgent, IAgentSchema, IEnvOptions, EAgentType, ELLMProvider } from '../index';

/**
 * Example 1: Using MainAgent with custom environment options
 * This will override process.env values
 */
const customEnvOptions: IEnvOptions = {
  // API Keys
  ANTHROPIC_API_KEY: 'your-custom-anthropic-key',
  OPENAI_KEY: 'your-custom-openai-key',
  DEEPSEEK_KEY: 'your-custom-deepseek-key',
  
  // LLM Settings
  LLM_PROVIDER: ELLMProvider.Anthropic,
  FAST_REQUEST_LLM_PROVIDER: ELLMProvider.DeepSeek,
  ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
  
  // Agent Settings
  IS_USE_SCHEDULED_REFLECTION: true,
  DEFAULT_WORK_TIMEOUT: 120000, // 2 minutes
  DEFAULT_PING_INTERVAL: 15000, // 15 seconds
};

const agentSchema: IAgentSchema = {
  id: 'example-agent',
  type: EAgentType.PERMANENT,
  name: 'ExampleAgent',
  prompt: 'You are a helpful assistant.',
};

// Create MainAgent with custom env options
const mainAgentWithCustomEnv = new MainAgent('agent-1', agentSchema, customEnvOptions);

/**
 * Example 2: Using MainAgent without custom options
 * This will fall back to process.env values
 */
const mainAgentWithDefaultEnv = new MainAgent('agent-2', agentSchema);

/**
 * Example 3: Partial override - only override specific values
 */
const partialEnvOptions: IEnvOptions = {
  ANTHROPIC_API_KEY: 'custom-key-only',
  IS_USE_SCHEDULED_REFLECTION: false, // Disable scheduled reflection
  // Other values will fall back to process.env
};

const mainAgentWithPartialEnv = new MainAgent('agent-3', agentSchema, partialEnvOptions);

/**
 * Example 4: Multi-tenant setup with different timeouts
 */
const customerAOptions: IEnvOptions = {
  ANTHROPIC_API_KEY: 'customer-a-key',
  DEFAULT_WORK_TIMEOUT: 60000, // 1 minute for customer A
};

const customerBOptions: IEnvOptions = {
  ANTHROPIC_API_KEY: 'customer-b-key',
  DEFAULT_WORK_TIMEOUT: 180000, // 3 minutes for customer B (premium)
};

const customerAAgent = new MainAgent('customer-a', agentSchema, customerAOptions);
const customerBAgent = new MainAgent('customer-b', agentSchema, customerBOptions);

export {
  mainAgentWithCustomEnv,
  mainAgentWithDefaultEnv,
  mainAgentWithPartialEnv,
  customerAAgent,
  customerBAgent,
};
