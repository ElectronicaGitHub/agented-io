
import { IAgentSchema } from './interfaces/agent-schema';
import { SimpleQueue } from './utils/simple-queue';
import { EAgentEvent } from './enums';
import { createAgentFactory } from './utils/agent-factory';
import { IAgent, IAgentMessage, IMainAgent } from './interfaces';
import { PROMPT_LAST_MESSAGES_N } from './consts/llm';

export class MainAgent implements IMainAgent {
  agents: IAgent[] = [];
  private messages: Record<string, IAgentMessage[]> = {};
  private textQueue: SimpleQueue<IAgentMessage> = new SimpleQueue(this.process.bind(this));
  private listeners: { [key: string]: ((...args: any[]) => void)[] } = {};

  // New messagesMap to store messages between parent and child agents
  private messagesMap: Record<string, IAgentMessage[]> = {};
  private agentsMap: Record<string, IAgent> = {};

  constructor(
    public id: string,
    private agentSchema: IAgentSchema,
  ) {}

  init() {
    console.log('[MainAgent.constructor] Agent started');
    this.initAgent(this.agentSchema);
  }

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  removeListener(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== listener);
  }

  private emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  async initAgent(agentSchema: IAgentSchema): Promise<IAgent> {
    const agent = createAgentFactory(agentSchema, undefined, this);
    this.addAgent(agent);
    await agent.init();
    
    return agent;
  }

  async process(item: IAgentMessage): Promise<void> {
    const { text, sender } = item;
    const mainAgent = this.agents[0];
    this.messages[sender] = this.messages[sender] || [];
    this.messages[sender].push({
      createdAt: new Date(),
      sender,
      senderType: item.senderType,
      text
    });

    mainAgent.process(text, sender);

    // After updating messagesMap
    this.emit(EAgentEvent.MESSAGES_MAP_UPDATED_FULL, { messages: this.messagesMap });
  }

  sendMessage(text: string, sender: string = 'user') {
    console.log(`[MainAgent.sendMessage] text: ${text}, sender: ${sender}`);
    this.textQueue.enqueue({ 
      text, 
      sender, 
      senderType: 'user',
      createdAt: new Date() 
    });
  }

  getAgentSchema(): IAgentSchema {
    return {
      ...this.agentSchema,
      id: this.id,
    };
  }

  // Helper function to create a combined key
  private getMessageKey(parentId: string, childId: string): string {
    return `${parentId}:${childId}`;
  }

  /**
   * Adds a message to the messagesMap with a combined key of parentId:childId
   * @param parentId - The ID of the parent agent
   * @param childId - The ID of the child agent
   * @param messages - The messages to add
   */
  public addMessages(parentId: string, childId: string, messages: IAgentMessage[]): void {
    const key = this.getMessageKey(parentId, childId);
    if (!this.messagesMap[key]) {
      this.messagesMap[key] = [];
    }
    this.messagesMap[key].push(...messages);
    
    // check for overfill PROMPT_LAST_MESSAGES_N
    if (this.messagesMap[key].length > PROMPT_LAST_MESSAGES_N) {
      console.log(`[MainAgent.addMessages] overfill PROMPT_LAST_MESSAGES_N, ${this.messagesMap[key].length}`);
      this.messagesMap[key] = this.messagesMap[key].slice(-PROMPT_LAST_MESSAGES_N);
    }
    this.emit(EAgentEvent.MESSAGES_UPDATED, { parentId, childId, messages: this.messagesMap[key] });
    this.emit(EAgentEvent.MESSAGES_MAP_UPDATED_FULL, { messages: this.messagesMap });
  }

  /**
   * Retrieves messages from the messagesMap based on parentId and childId
   * @param parentId - The ID of the parent agent
   * @param childId - The ID of the child agent
   * @returns An array of messages
   */
  public getMessages(parentId: string, childId: string): IAgentMessage[] {
    const key = this.getMessageKey(parentId, childId);
    return this.messagesMap[key] || [];
  }

  public getMessagesMap(): Record<string, IAgentMessage[]> {
    return this.messagesMap;
  }

  public addAgent(agent: IAgent): void {
    this.agents.push(agent);
    this.agentsMap[agent.name] = agent;
  }

  public getAgent(name?: string): IAgent | undefined {
    if (!name) {
      const mainAgentName = this.agentSchema.name;
      return this.agentsMap[mainAgentName];
    }
    return this.agentsMap[name];
  }

  /**
   * Retrieves the child agent based on the tabKey.
   * @param tabKey - The tab key in the format "parent:child".
   * @returns The corresponding Agent or null if not found.
   */
  getAgentByTabKey(tabKey: string): IAgent | undefined {
    const [parentName, childName] = tabKey.split(':');
    // parent first
    let agent = this.agentsMap[parentName];
    if (!agent) {
      console.error(`Parent agent "${parentName}" not found.`);
    }

    // if have child, then get child
    if (childName) {
      agent = this.agentsMap[childName];
      if (!agent) {
        console.error(`Child agent "${childName}"`);
        return undefined;
      }
    }

    return agent;
  }
}
