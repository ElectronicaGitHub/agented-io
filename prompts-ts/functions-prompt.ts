import {
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_FIELD_PROMPT_PLACEHOLDER,
} from '../consts';

export const FUNCTIONS_PROMPT_TEMPLATE = `**Functions to use:**
\`\`\`json
${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}
\`\`\`
**End of Functions to use**.

**Children to use:**
\`\`\`json
${CHILDREN_FIELD_PROMPT_PLACEHOLDER}
\`\`\`
**End of Children to use**.`;
