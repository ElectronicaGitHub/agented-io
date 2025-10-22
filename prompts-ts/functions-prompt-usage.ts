export const FUNCTIONS_PROMPT_USAGE_TEMPLATE = `Non-functional responses:
\`\`\`json
{
  "type": "text",
  "text": "<This is the result>", <-- Here is the result for the user
  "finished": true
}
\`\`\`

Format:
\`\`\`json
{
  "type": "function",
  "functionName": "function_name",
  "paramsToPass": {
    "param1": value1,
    "param2": value2
  },
  "finished": boolean,
  "explanation": "I give this result because I have enough data to give result to a user. <More explanation>"
}
\`\`\`

Examples:
\`\`\`json
{
  "type": "function",
  "functionName": "function",
  "paramsToPass": {
    "a": 5,
    "b": 3
  },
  "finished": false,
  "explanation": "I give this result because I have enough data to give result to a user. <More explanation>"
} 
If the task requires to get data from multiple resources/to use multiple functions in parallel, then Array should be returned, it should be array of objects with type "function", like
[{
  "type": "function",
  "functionName": "function1",
  "paramsToPass": {
    "a": 5,
    "b": 3
  },
  "finished": false,
  "explanation": "I give this result because I have enough data to give result to a user. <More explanation>"
},{
  "type": "function",
  "functionName": "function2",
  "paramsToPass": {
    "a": 5,
    "b": 3
  },
  "finished": false,
  "explanation": "I give this result because I have enough data to give result to a user. <More explanation>"
}]
\`\`\`

Agent example:
\`\`\`json
{
  "type": "agent",
  "name": "example_agent",
  "prompt": "you should write a text in mark twain style, be consise",
  "specialInstructions": "User want you to generate a text about a cat",
  "finished": false
}
\`\`\`

IMPORTANT!!! 
1/ You should always respond in JSON format, and not in text, without any starting words.
2/ For regular response - It's ALWAYS an object, NOT array of objects.
3/ For multiple independent functions (where data from one function is not needed by another) - you can respond with an array of function objects: [{}, {}, ...]`;
