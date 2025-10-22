# Custom Prompts Guide

## Overview

Starting from version X.X.X, agented.io supports custom prompts that allow you to fully customize the system prompt for your agents. This gives you complete control over how your agent behaves while maintaining compatibility with the framework's core functionality.

## Why Use Custom Prompts?

- **Full Control**: Define exactly how your agent should behave
- **Domain-Specific Agents**: Create specialized agents for specific use cases
- **Experimentation**: Test different prompting strategies
- **Multilingual Support**: Create prompts in any language
- **Custom Workflows**: Implement unique decision-making logic

## Quick Start

```typescript
import { 
  MainAgent,
  EAgentType,
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER,
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER,
  DYNAMIC_PROMPT_SEPARATOR,
} from 'agented.io';

const customPrompt = `
You are a helpful assistant.

Chat History:
${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}

${DYNAMIC_PROMPT_SEPARATOR}

Current Input:
${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;

const agent = new MainAgent('my-agent', {
  id: 'my-agent',
  name: 'MyAgent',
  type: EAgentType.DECIDER,
  customPrompt,
});

agent.init();
```

## Required Placeholders

Your custom prompt **MUST** include these placeholders:

### 1. `CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER`
Contains the conversation history. Essential for context-aware responses.

```typescript
import { CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER } from 'agented.io';

// In your prompt:
`Chat History: ${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}`
```

### 2. `LAST_INPUT_FIELD_PROMPT_PLACEHOLDER`
Contains the current user input. Required for processing the current request.

```typescript
import { LAST_INPUT_FIELD_PROMPT_PLACEHOLDER } from 'agented.io';

// In your prompt:
`Current Input: ${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}`
```

## Recommended Placeholders

For full functionality, include these placeholders:

### 3. `FUNCTIONS_FIELD_PROMPT_PLACEHOLDER`
Lists available functions the agent can call.

```typescript
import { FUNCTIONS_FIELD_PROMPT_PLACEHOLDER } from 'agented.io';

// In your prompt:
`Available Functions: ${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}`
```

### 4. `CHILDREN_FIELD_PROMPT_PLACEHOLDER`
Lists child agents available for delegation.

```typescript
import { CHILDREN_FIELD_PROMPT_PLACEHOLDER } from 'agented.io';

// In your prompt:
`Child Agents: ${CHILDREN_FIELD_PROMPT_PLACEHOLDER}`
```

### 5. `SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER`
Contains task-specific instructions passed at runtime.

```typescript
import { SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER } from 'agented.io';

// In your prompt:
`Instructions: ${SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER}`
```

### 6. `AGENT_NAME_FIELD_PROMPT_PLACEHOLDER`
The agent's name for self-reference.

```typescript
import { AGENT_NAME_FIELD_PROMPT_PLACEHOLDER } from 'agented.io';

// In your prompt:
`You are ${AGENT_NAME_FIELD_PROMPT_PLACEHOLDER}`
```

## Optional Placeholders

### 7. `MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER`
Results from mixin functions (if using mixins).

### 8. `CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER`
Current status of child agents (WORKING, READY, ERROR).

## Dynamic Prompt Separator

For optimal performance, split your prompt into cacheable and non-cacheable parts:

```typescript
import { DYNAMIC_PROMPT_SEPARATOR } from 'agented.io';

const prompt = `
# Cacheable Part (static instructions)
You are a helpful assistant...
[Your static instructions here]

${DYNAMIC_PROMPT_SEPARATOR}

# Non-Cacheable Part (dynamic data)
Chat History: ${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}
Current Input: ${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;
```

**Benefits:**
- The cacheable part is cached by the LLM provider
- Only the non-cacheable part is processed on each request
- Significantly reduces latency and costs

## Validation

### Automatic Validation

Custom prompts are automatically validated on agent initialization. If validation fails, an error is thrown with detailed information about missing placeholders.

```typescript
const agent = new MainAgent('my-agent', {
  id: 'my-agent',
  name: 'MyAgent',
  type: EAgentType.DECIDER,
  customPrompt: myPrompt, // Will throw if invalid
});
```

### Manual Validation

You can validate prompts before using them:

```typescript
import { validateCustomPrompt } from 'agented.io';

try {
  // Strict mode - throws on error
  validateCustomPrompt(myPrompt, true);
  console.log('✅ Prompt is valid');
} catch (error) {
  console.error('❌ Validation failed:', error.message);
}
```

### Non-Strict Validation

Get detailed feedback without throwing errors:

```typescript
import { validateCustomPrompt } from 'agented.io';

const result = validateCustomPrompt(myPrompt, false);

if (!result.isValid) {
  console.log('Errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.log('Warnings:', result.warnings);
}
```

### Get Available Placeholders

```typescript
import { getAvailablePlaceholders } from 'agented.io';

const placeholders = getAvailablePlaceholders();
// Returns: { "{{chat_history}}": "Chat history messages (REQUIRED)", ... }
```

## Complete Example

```typescript
import { 
  MainAgent,
  EAgentType,
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER,
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER,
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_FIELD_PROMPT_PLACEHOLDER,
  SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER,
  AGENT_NAME_FIELD_PROMPT_PLACEHOLDER,
  DYNAMIC_PROMPT_SEPARATOR,
  validateCustomPrompt,
} from 'agented.io';

// Define custom prompt
const customPrompt = `
# Agent: ${AGENT_NAME_FIELD_PROMPT_PLACEHOLDER}

## Your Role
You are a specialized customer support agent. Your goal is to help users
resolve their issues quickly and professionally.

## Guidelines
1. Always be polite and empathetic
2. Ask clarifying questions when needed
3. Use available functions to help users
4. Escalate to human support if needed

## Special Instructions
${SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER}

## Available Tools
### Functions
${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}

### Child Agents
${CHILDREN_FIELD_PROMPT_PLACEHOLDER}

## Response Format
Respond in JSON format:
- Text: {"type": "text", "text": "...", "finished": true}
- Function: {"type": "function", "functionName": "...", "paramsToPass": {...}, "finished": false}

## Conversation History
${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}

${DYNAMIC_PROMPT_SEPARATOR}

## Current User Message
${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;

// Validate the prompt
validateCustomPrompt(customPrompt, true);

// Create agent with custom prompt
const agent = new MainAgent('support-agent', {
  id: 'support-agent',
  name: 'SupportAgent',
  type: EAgentType.DECIDER,
  customPrompt,
  prompt: 'Focus on customer satisfaction',
  functions: [
    {
      name: 'checkOrderStatus',
      description: 'Check the status of an order',
      paramsToPass: { orderId: 'string' },
      func: async ({ orderId }) => {
        // Implementation
        return `Order ${orderId} status: Shipped`;
      },
    },
  ],
});

agent.init();
agent.sendMessage('What is the status of order #12345?', 'user');
```

## Using Base Templates

You can import and modify the default system prompts:

```typescript
import { 
  BASE_DECIDER_PROMPT_TEMPLATE,
  BASE_DECIDER_DYNAMIC_PROMPT_TEMPLATE,
  FUNCTIONS_PROMPT_TEMPLATE,
  FUNCTIONS_PROMPT_USAGE_TEMPLATE,
} from 'agented.io';

// Use as-is or modify
const myPrompt = BASE_DECIDER_PROMPT_TEMPLATE + '\n\n' + 'My custom additions...';
```

## Best Practices

1. **Always validate** your prompts before deployment
2. **Use the separator** to optimize caching
3. **Include all recommended placeholders** for full functionality
4. **Test thoroughly** with different inputs
5. **Document your prompts** for team collaboration
6. **Version control** your custom prompts
7. **Monitor performance** after deploying custom prompts

## Troubleshooting

### Error: Missing required placeholder

```
Custom prompt validation failed:
❌ Errors:
  - Missing required placeholder: {{chat_history}}
```

**Solution**: Add the missing placeholder to your prompt.

### Warning: Missing recommended placeholder

```
⚠️  Warnings:
  - Missing recommended placeholder: {{functions}}
```

**Solution**: Consider adding the placeholder for better functionality, or ignore if not needed.

### Prompt not working as expected

1. Check validation warnings
2. Ensure all placeholders are correctly formatted
3. Test with simple inputs first
4. Review the generated prompt in logs
5. Compare with base templates

## Migration from Default Prompts

If you're currently using the default prompts and want to customize:

1. Start with the base template:
```typescript
import { BASE_DECIDER_PROMPT_TEMPLATE } from 'agented.io';
```

2. Modify incrementally
3. Validate after each change
4. Test with existing use cases
5. Deploy gradually

## API Reference

### `validateCustomPrompt(prompt: string, strict: boolean = true): IPromptValidationResult`

Validates a custom prompt.

**Parameters:**
- `prompt`: The custom prompt string
- `strict`: If true, throws on validation failure

**Returns:** `IPromptValidationResult`
```typescript
{
  isValid: boolean;
  missingPlaceholders: string[];
  errors: string[];
  warnings: string[];
}
```

### `getAvailablePlaceholders(): Record<string, string>`

Returns all available placeholders with descriptions.

## Examples

See [custom-prompt-example.ts](../examples/custom-prompt-example.ts) for more examples.

## Support

If you encounter issues or have questions:
1. Check this documentation
2. Review the examples
3. Open an issue on GitHub
4. Join our Discord community
