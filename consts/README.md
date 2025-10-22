# Constants Directory

This directory contains all constants used throughout the agented.io framework.

## Files

### `agent.ts`
Core agent-related constants:
- `GET_AGENT_CONTEXT_FILENAME` - Function to generate context filenames
- `AGENT_TIMEOUTS` - Timeout configurations

### `agent-placeholders.ts`
All prompt placeholders and separators used in agent templates:

**Separator:**
- `DYNAMIC_PROMPT_SEPARATOR` - `++++dynamic_prompt_separator++++` - Separator for cacheable/non-cacheable prompt parts

**Core placeholders:**
- `CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER` - `{{chat_history}}`
- `LAST_INPUT_FIELD_PROMPT_PLACEHOLDER` - `{{last_input}}`

**Function and children:**
- `FUNCTIONS_FIELD_PROMPT_PLACEHOLDER` - `{{functions}}`
- `CHILDREN_FIELD_PROMPT_PLACEHOLDER` - `{{children}}`
- `CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER` - `{{children_status}}`

**Instructions:**
- `SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER` - `{{special_instructions}}`
- `PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER` - `{{parent_agent_special_instructions}}`

**Metadata:**
- `AGENT_NAME_FIELD_PROMPT_PLACEHOLDER` - `{{agent_name}}`
- `CONTEXT_FIELD_PROMPT_PLACEHOLDER` - `{{context}}`
- `MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER` - `{{mixins_result}}`

### `llm.ts`
LLM-related constants:
- Model names and configurations
- Token limits
- API endpoints

### `keys.ts`
API keys and authentication constants

### `files.ts`
File system related constants

### `consts.ts`
General framework constants

## Usage

All constants are re-exported through `index.ts`, so you can import them directly:

```typescript
import { 
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER,
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER,
  DYNAMIC_PROMPT_SEPARATOR,
  AGENT_TIMEOUTS 
} from 'agented.io';

// Use in custom prompts
const myPrompt = `
Chat: ${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}
${DYNAMIC_PROMPT_SEPARATOR}
Input: ${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;
```

Or import from specific files:

```typescript
import { 
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER 
} from 'agented.io/consts/agent-placeholders';
```

## Organization

Constants are organized by domain:
- **Agent-related** → `agent.ts`
- **Placeholders** → `agent-placeholders.ts` (for better maintainability)
- **LLM-related** → `llm.ts`
- **Keys** → `keys.ts`
- **Files** → `files.ts`
- **General** → `consts.ts`

This separation makes it easier to:
- Find specific constants
- Maintain and update values
- Avoid circular dependencies
- Keep files focused and readable
