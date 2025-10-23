export const FUNCTIONS_PROMPT_USAGE_TEMPLATE = `### Response Format:

**Text response:**
\`\`\`json
{"type": "text", "text": "result", "finished": true}
\`\`\`

**Function call:**
\`\`\`json
{"type": "function", "functionName": "name", "paramsToPass": {"param": "value"}, "finished": false, "explanation": "reason"}
\`\`\`

**Multiple parallel functions:**
\`\`\`json
[{"type": "function", "functionName": "fn1", "paramsToPass": {...}, "finished": false}, {"type": "function", "functionName": "fn2", "paramsToPass": {...}, "finished": false}]
\`\`\`

**Child agent:**
\`\`\`json
{"type": "agent", "name": "child_name", "specialInstructions": "task details", "finished": false}
\`\`\`

**CRITICAL:** Always return pure JSON (object or array), no text before/after.`;
