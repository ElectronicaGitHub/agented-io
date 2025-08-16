import { EAgentResponseType, EAgentType } from '../enums';
import { IAgentCommand } from './agent-command';

export interface IAgentMessage {
  createdAt: Date;
  sender: string;
  senderType: EAgentType | 'user';
  text: string;
  type?: EAgentResponseType;
  explanation?: string;
  specialInstructions?: string;
  functionName?: string;
  name?: string;
  commands?: IAgentCommand[];
  contexted?: boolean;
  metadata?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}