import { IAgentSchema } from './agent-schema';
/**
 * Typef for referencing the custom agent store item, with id, wallet and schema
 */
export interface ICustomAgentStoreItem {
    id: string;
    walletAddress: string;
    createdAt: Date;
    updatedAt: Date;
    schema: IAgentSchema;
}
