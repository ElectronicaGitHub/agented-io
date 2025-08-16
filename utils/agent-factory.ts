import { Agent } from '../agent';
import { IAgent, IAgentSchema, IMainAgent } from '../interfaces';
import { MainAgent } from '../main-agent';
import { v4 as uuidv4 } from 'uuid';

export const createAgentFactory = (agentSchema: IAgentSchema, parentAgent?: IAgent, mainAgent?: IMainAgent) => {
  const id = uuidv4();
  const agent = new Agent(id, agentSchema, parentAgent as any, mainAgent as any);

  return agent; 
}

export const createMainAgentFactory = (agentSchema: IAgentSchema, id?: string) => {
  const newId = id || uuidv4();
  return new MainAgent(newId, agentSchema);
}