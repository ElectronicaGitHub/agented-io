import { IAgent } from './agent';
import { IAgentMessage } from './agent-message';
import { IAgentSchema } from './agent-schema';
import { EAgentEvent } from '../enums';

export interface IMainAgent {
  id: string;
  getAgent(name?: string): IAgent | undefined;
  getAgentSchema(): IAgentSchema;
  getMessagesMap(): Record<string, any>;
  getAgentByTabKey(tabKey: string): IAgent | undefined;
  process(item: IAgentMessage): void;
  init(): void;
  sendMessage(text: string, role: string): void;
  on(event: EAgentEvent, callback: (data: any) => void): void;
  removeListener(event: EAgentEvent, callback: (data: any) => void): void;
}
