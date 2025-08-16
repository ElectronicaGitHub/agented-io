import { join } from 'path';

// Get the prompts directory relative to this file
// Using __dirname which is available in CommonJS
declare const __dirname: string;
const getPromptsPath = () => join(__dirname, '..', 'prompts');

export const GET_AGENT_CONTEXT_FILENAME = ({agentName, agentId}: {agentName: string, agentId: string}) => {
  return `${agentId}_${agentName}_ctx.txt`;
};

// base prompts - using relative paths from the library
export const BASE_DECIDER_PROMPT = 'BASE_DECIDER_PROMPT.md';
export const BASE_DECIDER_DYNAMIC_PROMPT = 'BASE_DECIDER_DYNAMIC_PROMPT.md';

export const DYNAMIC_PROMPT_SEPARATOR = '++++dynamic_prompt_separator++++';

export const BASE_REFLECTION_PROMPT = 'BASE_REFLECTION_PROMPT.md';
export const SUMMARIZER_PROMPT = 'SUMMARIZER_PROMPT.md';
export const FUNCTIONS_PROMPT = 'FUNCTIONS_PROMPT.md';
export const FUNCTIONS_PROMPT_USAGE = 'FUNCTIONS_PROMPT_USAGE.md';
export const FUNCTIONS_PROMPT_EXISTENSE = 'FUNCTIONS_PROMPT_EXISTENSE.md';
export const TEXT_PROMPT_USAGE = 'TEXT_PROMPT_USAGE.md';

// Function to get the prompts directory path
export const getPromptsDirectory = () => getPromptsPath();

// custom prompts
export const BASIC_PROMPT = 'prompts/custom_prompts/BASIC_PROMPT.md';
export const GET_WEB_CONTENT_PROMPT = 'prompts/custom_prompts/GET_WEB_CONTENT_PROMPT.md';
export const REFLECTION_PROMPT = 'prompts/custom_prompts/REFLECTION_PROMPT.md';
export const FLOW_INSTRUCTION_PROMPT = 'prompts/custom_prompts/FLOW_INSTRUCTION_PROMPT.md';

// placeholders
export const FUNCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{functions}}';
export const SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{special_instructions}}';
export const CONTEXT_FIELD_PROMPT_PLACEHOLDER = '{{context}}';
export const LAST_INPUT_FIELD_PROMPT_PLACEHOLDER = '{{last_input}}';
export const PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{parent_agent_special_instructions}}';
export const CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER = '{{chat_history}}';
export const CHILDREN_FIELD_PROMPT_PLACEHOLDER = '{{children}}';
export const MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER = '{{mixins_result}}';
export const AGENT_NAME_FIELD_PROMPT_PLACEHOLDER = '{{agent_name}}';
export const CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER = '{{children_status}}';

// function prompts placeholders
export const URL_FIELD = '{{url}}';
export const CONTENT_FIELD = '{{content}}';

export const AGENT_TIMEOUTS = {
  DEFAULT_WORK_TIMEOUT: process.env.DEFAULT_WORK_TIMEOUT || 60000, // 1 minute default timeout
  DEFAULT_PING_INTERVAL: process.env.DEFAULT_PING_INTERVAL || 10000, // 10 seconds ping interval
  MAX_RETRY_COUNT: process.env.MAX_RETRY_COUNT || 3,
  RETRY_BACKOFF_MULTIPLIER: process.env.RETRY_BACKOFF_MULTIPLIER || 1.5, // Each retry will wait 1.5x longer
} as const;