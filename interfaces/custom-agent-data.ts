import { IPublicCustomAgent } from './public-custom-agents-service';

export interface ICustomAgentData {
  walletAddress: string;
  agentId: string;
  entityId?: IPublicCustomAgent['id'];
}