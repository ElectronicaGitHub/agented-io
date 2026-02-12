export const FUNCTIONS_PROMPT_USAGE_TEMPLATE = `### Response Format:

Always respond with a single JSON object containing \`actions\` array and \`finished\` flag:

\`\`\`json
{"actions": [<action1>, <action2>, ...], "finished": <true|false>, "explanation": "optional reason"}
\`\`\`

**Action types:**

Text response: \`{"type": "text", "text": "your message"}\`
Function call: \`{"type": "function", "functionName": "name", "paramsToPass": {"param": "value"}}\`
Child agent: \`{"type": "agent", "name": "child_name", "specialInstructions": "task details"}\`

**Examples:**

Text only (finished): \`{"actions": [{"type": "text", "text": "Here is the result"}], "finished": true}\`
Function call: \`{"actions": [{"type": "function", "functionName": "fn1", "paramsToPass": {"key": "val"}}], "finished": false}\`
Text + functions: \`{"actions": [{"type": "text", "text": "Working on it..."}, {"type": "function", "functionName": "fn1", "paramsToPass": {}}], "finished": false}\`
Multiple parallel functions: \`{"actions": [{"type": "function", "functionName": "fn1", "paramsToPass": {}}, {"type": "function", "functionName": "fn2", "paramsToPass": {}}], "finished": false}\`

**Rules:**
- \`finished: true\` — task complete, no more work needed
- \`finished: false\` — more work needed (functions/agents to execute)
- You can combine text with functions/agents in a single response
- Functions in actions array execute in parallel

**CRITICAL:** Always return pure JSON object, no text before/after.`;
