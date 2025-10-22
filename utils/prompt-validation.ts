import {
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER,
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER,
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_FIELD_PROMPT_PLACEHOLDER,
  SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER,
  MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER,
  AGENT_NAME_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER,
  DYNAMIC_PROMPT_SEPARATOR,
} from '../consts';

export interface IPromptValidationResult {
  isValid: boolean;
  missingPlaceholders: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Required placeholders that must be present in a custom prompt
 */
const REQUIRED_PLACEHOLDERS = [
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER,
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER,
] as const;

/**
 * Recommended placeholders for better functionality
 */
const RECOMMENDED_PLACEHOLDERS = [
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_FIELD_PROMPT_PLACEHOLDER,
  SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER,
  AGENT_NAME_FIELD_PROMPT_PLACEHOLDER,
] as const;

/**
 * Optional placeholders
 */
const OPTIONAL_PLACEHOLDERS = [
  MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER,
] as const;

/**
 * Validates a custom prompt to ensure it contains all required placeholders
 * and the dynamic prompt separator for caching optimization
 * 
 * @param customPrompt - The custom prompt string to validate
 * @param strict - If true, throws an error on validation failure. If false, returns validation result
 * @returns Validation result object
 * @throws Error if strict mode is enabled and validation fails
 */
export function validateCustomPrompt(
  customPrompt: string,
  strict: boolean = true
): IPromptValidationResult {
  const result: IPromptValidationResult = {
    isValid: true,
    missingPlaceholders: [],
    errors: [],
    warnings: [],
  };

  // Check for required placeholders
  for (const placeholder of REQUIRED_PLACEHOLDERS) {
    if (!customPrompt.includes(placeholder)) {
      result.isValid = false;
      result.missingPlaceholders.push(placeholder);
      result.errors.push(
        `Missing required placeholder: ${placeholder}. This placeholder is essential for the agent to function properly.`
      );
    }
  }

  // Check for recommended placeholders
  for (const placeholder of RECOMMENDED_PLACEHOLDERS) {
    if (!customPrompt.includes(placeholder)) {
      result.warnings.push(
        `Missing recommended placeholder: ${placeholder}. The agent may have limited functionality without it.`
      );
    }
  }

  // Check for dynamic prompt separator (for caching optimization)
  if (!customPrompt.includes(DYNAMIC_PROMPT_SEPARATOR)) {
    result.warnings.push(
      `Missing dynamic prompt separator: "${DYNAMIC_PROMPT_SEPARATOR}". ` +
      `This separator is used to split the prompt into cacheable and non-cacheable parts for performance optimization. ` +
      `Without it, the entire prompt will be treated as non-cacheable.`
    );
  }

  // If strict mode and validation failed, throw error
  if (strict && !result.isValid) {
    const errorMessage = [
      'Custom prompt validation failed:',
      '',
      '❌ Errors:',
      ...result.errors.map(err => `  - ${err}`),
      '',
      result.warnings.length > 0 ? '⚠️  Warnings:' : '',
      ...result.warnings.map(warn => `  - ${warn}`),
      '',
      'Required placeholders:',
      ...REQUIRED_PLACEHOLDERS.map(p => `  - ${p}`),
      '',
      'Recommended placeholders:',
      ...RECOMMENDED_PLACEHOLDERS.map(p => `  - ${p}`),
      '',
      'Optional placeholders:',
      ...OPTIONAL_PLACEHOLDERS.map(p => `  - ${p}`),
      '',
      `Dynamic separator: ${DYNAMIC_PROMPT_SEPARATOR}`,
    ].filter(Boolean).join('\n');

    throw new Error(errorMessage);
  }

  return result;
}

/**
 * Gets a list of all available placeholders with descriptions
 */
export function getAvailablePlaceholders(): Record<string, string> {
  return {
    [CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER]: 'Chat history messages (REQUIRED)',
    [LAST_INPUT_FIELD_PROMPT_PLACEHOLDER]: 'Last user input (REQUIRED)',
    [FUNCTIONS_FIELD_PROMPT_PLACEHOLDER]: 'Available functions for the agent (RECOMMENDED)',
    [CHILDREN_FIELD_PROMPT_PLACEHOLDER]: 'Child agents available (RECOMMENDED)',
    [SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER]: 'Special instructions for the agent (RECOMMENDED)',
    [AGENT_NAME_FIELD_PROMPT_PLACEHOLDER]: 'Name of the agent (RECOMMENDED)',
    [MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER]: 'Results from mixins (OPTIONAL)',
    [CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER]: 'Status of child agents (OPTIONAL)',
    [DYNAMIC_PROMPT_SEPARATOR]: 'Separator for cacheable/non-cacheable parts (RECOMMENDED)',
  };
}
