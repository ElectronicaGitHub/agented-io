/**
 * Prompt placeholders used in agent templates
 * These placeholders are replaced with actual values during prompt construction
 */

// Dynamic prompt separator for caching optimization
export const DYNAMIC_PROMPT_SEPARATOR = '++++dynamic_prompt_separator++++';

// Core placeholders (required for most agents)
export const CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER = '{{chat_history}}';
export const LAST_INPUT_FIELD_PROMPT_PLACEHOLDER = '{{last_input}}';

// Function and children placeholders
export const FUNCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{functions}}';
export const CHILDREN_FIELD_PROMPT_PLACEHOLDER = '{{children}}';
export const CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER = '{{children_status}}';

// Instruction placeholders
export const SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{special_instructions}}';
export const PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER = '{{parent_agent_special_instructions}}';

// Agent metadata placeholders
export const AGENT_NAME_FIELD_PROMPT_PLACEHOLDER = '{{agent_name}}';
export const CONTEXT_FIELD_PROMPT_PLACEHOLDER = '{{context}}';
export const MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER = '{{mixins_result}}';

// Legacy/custom placeholders
export const URL_FIELD = '{{url}}';
export const CONTENT_FIELD = '{{content}}';
