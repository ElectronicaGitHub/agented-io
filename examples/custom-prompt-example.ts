/**
 * Example: Using Custom Prompts with agented.io
 * 
 * This example demonstrates how to create and use custom prompts
 * with proper placeholder usage and validation.
 */

import { 
  MainAgent,
  EAgentType,
  // Import placeholders
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER,
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER,
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_FIELD_PROMPT_PLACEHOLDER,
  SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER,
  AGENT_NAME_FIELD_PROMPT_PLACEHOLDER,
  MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER,
  DYNAMIC_PROMPT_SEPARATOR,
  // Import validation utilities
  validateCustomPrompt,
  getAvailablePlaceholders,
  // Import base templates (optional - for reference)
  BASE_DECIDER_PROMPT_TEMPLATE,
} from '../index';

/**
 * Example 1: Simple Custom Prompt
 * This is a minimal custom prompt with only required placeholders
 */
const simpleCustomPrompt = `
You are a helpful assistant named ${AGENT_NAME_FIELD_PROMPT_PLACEHOLDER}.

### Instructions:
- Answer user questions clearly and concisely
- Use available functions when needed
- Follow special instructions if provided

### Special Instructions:
${SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER}

### Available Functions:
${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}

### Available Children:
${CHILDREN_FIELD_PROMPT_PLACEHOLDER}

### Chat History:
${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}

${DYNAMIC_PROMPT_SEPARATOR}

### Current User Input:
${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;

/**
 * Example 2: Advanced Custom Prompt with all placeholders
 * This includes optional placeholders for maximum functionality
 */
const advancedCustomPrompt = `
# Agent: ${AGENT_NAME_FIELD_PROMPT_PLACEHOLDER}

## Role and Capabilities
You are an advanced AI agent with access to functions and child agents.
Your goal is to help users accomplish their tasks efficiently.

## Special Instructions
${SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER}

## Mixins Context
${MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER}

## Available Tools

### Functions
${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}

### Child Agents
${CHILDREN_FIELD_PROMPT_PLACEHOLDER}

### Children Status
${CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER}

## Decision Making Rules
1. Analyze the user's request carefully
2. Check if you have the necessary functions or children to help
3. If you need more information, ask the user
4. Execute functions only when you have all required parameters
5. Return finished: true when the task is complete

## Response Format
Always respond in valid JSON format:
- For text responses: {"type": "text", "text": "...", "finished": true}
- For function calls: {"type": "function", "functionName": "...", "paramsToPass": {...}, "finished": false}
- For agent calls: {"type": "agent", "name": "...", "specialInstructions": "...", "finished": false}

## Conversation Context

### Previous Messages
${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}

${DYNAMIC_PROMPT_SEPARATOR}

### Current Request
${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;

/**
 * Example 3: Validating a custom prompt before use
 */
function validateMyPrompt(customPrompt: string) {
  try {
    // Strict validation - will throw error if invalid
    const result = validateCustomPrompt(customPrompt, true);
    console.log('✅ Prompt is valid!');
    return true;
  } catch (error: any) {
    console.error('❌ Prompt validation failed:', error.message);
    return false;
  }
}

/**
 * Example 4: Non-strict validation to get detailed feedback
 */
function checkPromptQuality(customPrompt: string) {
  // Non-strict mode - returns validation result without throwing
  const result = validateCustomPrompt(customPrompt, false);
  
  if (result.isValid) {
    console.log('✅ Prompt is valid!');
  } else {
    console.log('❌ Prompt has errors:');
    result.errors.forEach((err: string) => console.log(`  - ${err}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach((warn: string) => console.log(`  - ${warn}`));
  }
  
  return result;
}

/**
 * Example 5: Getting list of available placeholders
 */
function showAvailablePlaceholders() {
  const placeholders = getAvailablePlaceholders();
  
  console.log('Available placeholders:');
  Object.entries(placeholders).forEach(([placeholder, description]) => {
    console.log(`  ${placeholder}`);
    console.log(`    ${description}`);
  });
}

/**
 * Example 6: Creating an agent with a custom prompt
 */
async function createAgentWithCustomPrompt() {
  // Validate the prompt first
  if (!validateMyPrompt(simpleCustomPrompt)) {
    throw new Error('Custom prompt validation failed');
  }

  const mainAgent = new MainAgent(
    'custom-agent-1',
    {
      id: 'custom-agent-1',
      name: 'CustomAgent',
      type: EAgentType.PERMANENT,
      // Use the custom prompt
      customPrompt: simpleCustomPrompt,
      // You can still provide special instructions
      prompt: 'Be friendly and helpful',
      functions: [
        {
          name: 'greet',
          description: 'Greet the user',
          func: async () => 'Hello! How can I help you today?',
        },
      ],
    }
  );

  mainAgent.init();
  return mainAgent;
}

/**
 * Example 7: Building a custom prompt programmatically
 */
function buildCustomPrompt(options: {
  agentRole: string;
  responseStyle: string;
  additionalRules?: string[];
}): string {
  const rules = options.additionalRules?.map((rule, i) => `${i + 1}. ${rule}`).join('\n') || '';
  
  return `
# AI Agent: ${AGENT_NAME_FIELD_PROMPT_PLACEHOLDER}

## Role
${options.agentRole}

## Response Style
${options.responseStyle}

## Special Instructions
${SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER}

${rules ? `## Additional Rules\n${rules}\n` : ''}

## Available Tools
Functions: ${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}
Children: ${CHILDREN_FIELD_PROMPT_PLACEHOLDER}

## Conversation
${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}

${DYNAMIC_PROMPT_SEPARATOR}

## Current Input
${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;
}

/**
 * Example 8: Using the programmatic builder
 */
async function createSpecializedAgent() {
  const customPrompt = buildCustomPrompt({
    agentRole: 'You are a code review assistant',
    responseStyle: 'Be concise and focus on actionable feedback',
    additionalRules: [
      'Check for security vulnerabilities',
      'Suggest performance improvements',
      'Ensure code follows best practices',
    ],
  });

  // Validate before use
  validateCustomPrompt(customPrompt, true);

  const agent = new MainAgent('code-reviewer', {
    id: 'code-reviewer',
    name: 'CodeReviewer',
    type: EAgentType.PERMANENT,
    customPrompt,
  });

  agent.init();
  return agent;
}

// Export examples
export {
  simpleCustomPrompt,
  advancedCustomPrompt,
  validateMyPrompt,
  checkPromptQuality,
  showAvailablePlaceholders,
  createAgentWithCustomPrompt,
  buildCustomPrompt,
  createSpecializedAgent,
};
