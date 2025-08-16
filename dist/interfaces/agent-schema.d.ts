import { EAgentStatus, EAgentType } from '../enums';
import { IAgentCtx } from './agent-ctx';
import { IAgentFunctionDefinition, IMarketplaceFunctionDefinition } from './agent-function';
import { ISplitPrompt } from './agent-split-prompt';
import { IFunctionsStoreService } from './functions-store-service.interface';
export interface IAgentSchema {
    /**
     * Unique identifier for the agent
     */
    id: string;
    type: EAgentType;
    name: string;
    status?: EAgentStatus;
    createdAt?: Date;
    updatedAt?: Date;
    /**
     * This is general prompt for the agent
     */
    prompt?: string;
    /**
     * This prompt will be used to instruct the agent how to run specific tasks
     */
    flowInstructionPrompt?: string;
    /**
     * Split prompt configuration
     */
    splitPrompt?: ISplitPrompt;
    functions?: IAgentFunctionDefinition[];
    /**
     * Functions store service
     */
    functionsStoreService?: IFunctionsStoreService;
    marketplaceFunctions?: IMarketplaceFunctionDefinition[];
    mixins?: IAgentMixin[];
    reflections?: IAgentSchema[];
    children?: IAgentSchema[];
    /**
     * This is the cron schedule for the reflection agent
     */
    cronSchedule?: string;
    /**
     * This is the option to make the reflection agent init on start
     */
    cronInitOnStart?: boolean;
    /**
     * Maximum time in milliseconds that this agent can spend in WORKING state
     * before timing out. Defaults to 60000 (1 minute)
     */
    workTimeout?: number;
    /**
     * Interval in milliseconds between status checks when agent is WORKING
     * Defaults to 10000 (10 seconds)
     */
    pingInterval?: number;
}
export interface IAgentMixin {
    func: (ctx: IAgentCtx) => string;
}
