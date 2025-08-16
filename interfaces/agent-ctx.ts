import { IAgentMessage } from './agent-message';

export interface IAgentCtxDetailsStatic {
  agentId: string;
  agentName: string;
  inputText: string;
  sender: string;
}
export type IUpdatedContext = Record<string, any>;

export interface IAgentCtx extends IUpdatedContext, IAgentCtxDetailsStatic {
  updateCtx: (partialCtx: IUpdatedContext) => void;
  messages?: IAgentMessage[];
}