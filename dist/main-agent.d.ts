import { IAgentSchema } from './interfaces/agent-schema';
import { IAgent, IAgentMessage, IMainAgent } from './interfaces';
export declare class MainAgent implements IMainAgent {
    id: string;
    private agentSchema;
    agents: IAgent[];
    private messages;
    private textQueue;
    private listeners;
    private messagesMap;
    private agentsMap;
    constructor(id: string, agentSchema: IAgentSchema);
    init(): void;
    on(event: string, listener: (...args: any[]) => void): void;
    removeListener(event: string, listener: (...args: any[]) => void): void;
    private emit;
    initAgent(agentSchema: IAgentSchema): Promise<IAgent>;
    process(item: IAgentMessage): Promise<void>;
    sendMessage(text: string, sender?: string): void;
    getAgentSchema(): IAgentSchema;
    private getMessageKey;
    /**
     * Adds a message to the messagesMap with a combined key of parentId:childId
     * @param parentId - The ID of the parent agent
     * @param childId - The ID of the child agent
     * @param messages - The messages to add
     */
    addMessages(parentId: string, childId: string, messages: IAgentMessage[]): void;
    /**
     * Retrieves messages from the messagesMap based on parentId and childId
     * @param parentId - The ID of the parent agent
     * @param childId - The ID of the child agent
     * @returns An array of messages
     */
    getMessages(parentId: string, childId: string): IAgentMessage[];
    getMessagesMap(): Record<string, IAgentMessage[]>;
    addAgent(agent: IAgent): void;
    getAgent(name?: string): IAgent | undefined;
    /**
     * Retrieves the child agent based on the tabKey.
     * @param tabKey - The tab key in the format "parent:child".
     * @returns The corresponding Agent or null if not found.
     */
    getAgentByTabKey(tabKey: string): IAgent | undefined;
}
