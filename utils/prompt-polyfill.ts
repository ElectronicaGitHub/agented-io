import { 
  AGENT_NAME_FIELD_PROMPT_PLACEHOLDER, 
  CHILDREN_FIELD_PROMPT_PLACEHOLDER, 
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER,
} from '../consts';
import { IAgentSchema, IAgentUnitedFunction } from '../interfaces';

export function promptPolyfill(basePrompt: string, {
  agentName,
  functions,  
  children,
  specialInstructions,
  }: {
  agentName: string,
  functions: IAgentUnitedFunction[],
  children: IAgentSchema[],
  specialInstructions: string,
}) {
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
    [AGENT_NAME_FIELD_PROMPT_PLACEHOLDER]: agentName,
    [FUNCTIONS_FIELD_PROMPT_PLACEHOLDER]: functionsStr,
    [CHILDREN_FIELD_PROMPT_PLACEHOLDER]: childrenStr,
    [SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER]: specialInstructions,
  });
}

export function inPromptReplacer(prompt: string, replaces: {[k: string]: string }) {
  Object.keys(replaces).forEach(key => {
    prompt = prompt.replace(key, replaces[key]);
  });
  return prompt;
}