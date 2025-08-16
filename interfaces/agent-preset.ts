import { IAgentSchema } from './agent-schema';

export interface IAgentPreset {
  name: string;
  description: string;
  config: IAgentSchema;
} 