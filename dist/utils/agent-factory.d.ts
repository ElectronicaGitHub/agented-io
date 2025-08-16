import { Agent } from '../agent';
import { IAgent, IAgentSchema, IMainAgent } from '../interfaces';
import { MainAgent } from '../main-agent';
export declare const createAgentFactory: (agentSchema: IAgentSchema, parentAgent?: IAgent, mainAgent?: IMainAgent) => Agent;
export declare const createMainAgentFactory: (agentSchema: IAgentSchema, id?: string) => MainAgent;
