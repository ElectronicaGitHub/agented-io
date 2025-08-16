import { IAgentSchema, IAgentUnitedFunction } from '../interfaces';
export declare function promptPolyfill(basePrompt: string, { agentName, functions, children, specialInstructions, }: {
    agentName: string;
    functions: IAgentUnitedFunction[];
    children: IAgentSchema[];
    specialInstructions: string;
}): string;
export declare function inPromptReplacer(prompt: string, replaces: {
    [k: string]: string;
}): string;
