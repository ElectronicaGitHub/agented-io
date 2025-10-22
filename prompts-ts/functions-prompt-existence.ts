import {
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  CHILDREN_FIELD_PROMPT_PLACEHOLDER,
} from '../consts';

export const FUNCTIONS_PROMPT_EXISTENCE_TEMPLATE = `**Your agent have functions to use:**
\`\`\`json
${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}
\`\`\`
**End of Your agent have functions to use**.

**Your agent have children to use:**
\`\`\`json
${CHILDREN_FIELD_PROMPT_PLACEHOLDER}
\`\`\`
**End of Your agent have children to use**.`;
