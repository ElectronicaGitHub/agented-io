import { EAgentStatus } from '../enums';
import { IAgentFunctionDefinition, IMarketplaceFunctionDefinition } from './agent-function';
import { IAgentMessage } from './agent-message';
import { ISplitPrompt } from './agent-split-prompt';

export interface IAgent {
  id: string;
  name: string;
  prompt: string;
  functions?: IAgentFunctionDefinition[];
  marketplaceFunctions?: IMarketplaceFunctionDefinition[];
  status: EAgentStatus;
  
  preRequestBuildSplitPrompt(prompt: string, messages: string[], mixinsResult?: string): Promise<ISplitPrompt>;
  process(text: string, role: string): void;
  init(): Promise<void>;
  
  // Additional properties needed for compatibility
  currentStatus: EAgentStatus;
  emit(event: string, ...args: any[]): void;

  on(event: string, listener: (...args: any[]) => void): void;

  setInitialMessages(messages: IAgentMessage[]): void;
  setCtx(ctx: any): void;
}
