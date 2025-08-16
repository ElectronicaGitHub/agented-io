"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptPolyfill = promptPolyfill;
exports.inPromptReplacer = inPromptReplacer;
const agent_1 = require("../consts/agent");
function promptPolyfill(basePrompt, { agentName, functions, children, specialInstructions, }) {
    if (!basePrompt || !functions) {
        return basePrompt;
    }
    const childrenStr = children.map(child => {
        const childFunctions = [
            ...(child.functions?.filter(Boolean) || []),
            ...(child.marketplaceFunctions?.filter(Boolean) || []),
        ];
        const childFunctionsStr = childFunctions?.map(func => `{
      "type": "function",
      "name": "${func.name}",
      "description": "${func.description}",
    }`).join(',\n') || '';
        return `{
      "type": "agent",
      "name": "${child.name}",
      "prompt": "${child.prompt}",
      "childFunctions": [
        ${childFunctionsStr}
      ],
    }`;
    }).join('\n');
    const functionsStr = functions.map(func => {
        return `{
      "type": "function",
      "functionName": "${func.name}",
      "description": "${func.description}",
      "paramsToPass": {
        ${func.paramsToPass ? Object.entries(func.paramsToPass).map(([key, value]) => `${key}: ${value}`).join(',\n') : ''}
      },
    }`;
    }).join('\n');
    return inPromptReplacer(basePrompt, {
        [agent_1.AGENT_NAME_FIELD_PROMPT_PLACEHOLDER]: agentName,
        [agent_1.FUNCTIONS_FIELD_PROMPT_PLACEHOLDER]: functionsStr,
        [agent_1.CHILDREN_FIELD_PROMPT_PLACEHOLDER]: childrenStr,
        [agent_1.SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER]: specialInstructions,
    });
}
function inPromptReplacer(prompt, replaces) {
    Object.keys(replaces).forEach(key => {
        prompt = prompt.replace(key, replaces[key]);
    });
    return prompt;
}
