"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_TIMEOUTS = exports.CONTENT_FIELD = exports.URL_FIELD = exports.CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER = exports.AGENT_NAME_FIELD_PROMPT_PLACEHOLDER = exports.MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER = exports.CHILDREN_FIELD_PROMPT_PLACEHOLDER = exports.CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER = exports.PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = exports.LAST_INPUT_FIELD_PROMPT_PLACEHOLDER = exports.CONTEXT_FIELD_PROMPT_PLACEHOLDER = exports.SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = exports.FUNCTIONS_FIELD_PROMPT_PLACEHOLDER = exports.FLOW_INSTRUCTION_PROMPT = exports.REFLECTION_PROMPT = exports.GET_WEB_CONTENT_PROMPT = exports.BASIC_PROMPT = exports.getPromptsDirectory = exports.TEXT_PROMPT_USAGE = exports.FUNCTIONS_PROMPT_EXISTENSE = exports.FUNCTIONS_PROMPT_USAGE = exports.FUNCTIONS_PROMPT = exports.SUMMARIZER_PROMPT = exports.BASE_REFLECTION_PROMPT = exports.DYNAMIC_PROMPT_SEPARATOR = exports.BASE_DECIDER_DYNAMIC_PROMPT = exports.BASE_DECIDER_PROMPT = exports.GET_AGENT_CONTEXT_FILENAME = void 0;
const path_1 = require("path");
const getPromptsPath = () => (0, path_1.join)(__dirname, '..', 'prompts');
const GET_AGENT_CONTEXT_FILENAME = ({ agentName, agentId }) => {
    return `${agentId}_${agentName}_ctx.txt`;
};
exports.GET_AGENT_CONTEXT_FILENAME = GET_AGENT_CONTEXT_FILENAME;
// base prompts - using relative paths from the library
exports.BASE_DECIDER_PROMPT = 'BASE_DECIDER_PROMPT.md';
exports.BASE_DECIDER_DYNAMIC_PROMPT = 'BASE_DECIDER_DYNAMIC_PROMPT.md';
exports.DYNAMIC_PROMPT_SEPARATOR = '++++dynamic_prompt_separator++++';
exports.BASE_REFLECTION_PROMPT = 'BASE_REFLECTION_PROMPT.md';
exports.SUMMARIZER_PROMPT = 'SUMMARIZER_PROMPT.md';
exports.FUNCTIONS_PROMPT = 'FUNCTIONS_PROMPT.md';
exports.FUNCTIONS_PROMPT_USAGE = 'FUNCTIONS_PROMPT_USAGE.md';
exports.FUNCTIONS_PROMPT_EXISTENSE = 'FUNCTIONS_PROMPT_EXISTENSE.md';
exports.TEXT_PROMPT_USAGE = 'TEXT_PROMPT_USAGE.md';
// Function to get the prompts directory path
const getPromptsDirectory = () => getPromptsPath();
exports.getPromptsDirectory = getPromptsDirectory;
// custom prompts
exports.BASIC_PROMPT = 'prompts/custom_prompts/BASIC_PROMPT.md';
exports.GET_WEB_CONTENT_PROMPT = 'prompts/custom_prompts/GET_WEB_CONTENT_PROMPT.md';
exports.REFLECTION_PROMPT = 'prompts/custom_prompts/REFLECTION_PROMPT.md';
exports.FLOW_INSTRUCTION_PROMPT = 'prompts/custom_prompts/FLOW_INSTRUCTION_PROMPT.md';
// placeholders
exports.FUNCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{functions}}';
exports.SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{special_instructions}}';
exports.CONTEXT_FIELD_PROMPT_PLACEHOLDER = '{{context}}';
exports.LAST_INPUT_FIELD_PROMPT_PLACEHOLDER = '{{last_input}}';
exports.PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{parent_agent_special_instructions}}';
exports.CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER = '{{chat_history}}';
exports.CHILDREN_FIELD_PROMPT_PLACEHOLDER = '{{children}}';
exports.MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER = '{{mixins_result}}';
exports.AGENT_NAME_FIELD_PROMPT_PLACEHOLDER = '{{agent_name}}';
exports.CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER = '{{children_status}}';
// function prompts placeholders
exports.URL_FIELD = '{{url}}';
exports.CONTENT_FIELD = '{{content}}';
exports.AGENT_TIMEOUTS = {
    DEFAULT_WORK_TIMEOUT: process.env.DEFAULT_WORK_TIMEOUT || 60000, // 1 minute default timeout
    DEFAULT_PING_INTERVAL: process.env.DEFAULT_PING_INTERVAL || 10000, // 10 seconds ping interval
    MAX_RETRY_COUNT: process.env.MAX_RETRY_COUNT || 3,
    RETRY_BACKOFF_MULTIPLIER: process.env.RETRY_BACKOFF_MULTIPLIER || 1.5, // Each retry will wait 1.5x longer
};
