import { EAgentResponseType } from '../enums';
export type IAgentResponse = (IAgentResponseFunction | IAgentResponseText | IAgentResponseAgent | IAgentResponseMultipleFunctions) & {
    explanation?: string;
};
export interface IAgentResponseAgent {
    type: EAgentResponseType.AGENT;
    name: string;
    prompt: string;
    specialInstructions: string;
    finished: boolean;
}
export interface IAgentResponseFunction {
    type: EAgentResponseType.FUNCTION;
    functionName: string;
    paramsToPass: Record<string, any>;
    finished: boolean;
}
export interface IAgentResponseText {
    type: EAgentResponseType.TEXT;
    text: string;
    finished: boolean;
}
export interface IAgentResponseMultipleFunctions {
    type: EAgentResponseType.MULTIPLE_FUNCTIONS;
    functions: IAgentResponseFunction[];
    finished: boolean;
}
