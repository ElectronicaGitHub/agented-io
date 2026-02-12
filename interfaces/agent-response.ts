import { EAgentResponseType } from '../enums';

// --- Unified Actions-based Response Format ---

export interface IAgentActionText {
  type: EAgentResponseType.TEXT;
  text: string;
}

export interface IAgentActionFunction {
  type: EAgentResponseType.FUNCTION;
  functionName: string;
  paramsToPass: Record<string, any>;
}

export interface IAgentActionAgent {
  type: EAgentResponseType.AGENT;
  name: string;
  specialInstructions: string;
}

export type IAgentAction = IAgentActionText | IAgentActionFunction | IAgentActionAgent;

export interface IAgentResponseUnified {
  actions: IAgentAction[];
  finished: boolean;
  explanation?: string;
}

export type IAgentResponse = IAgentResponseUnified;
