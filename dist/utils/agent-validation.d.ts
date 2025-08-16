import { IAgentSchema } from '../interfaces';
export declare class AgentValidationError extends Error {
    constructor(message: string);
}
export declare function validateAgentHierarchy(schema: IAgentSchema): void;
