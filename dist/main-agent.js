"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainAgent = void 0;
const simple_queue_1 = require("./utils/simple-queue");
const enums_1 = require("./enums");
const agent_factory_1 = require("./utils/agent-factory");
const llm_1 = require("./consts/llm");
class MainAgent {
    constructor(id, agentSchema) {
        this.id = id;
        this.agentSchema = agentSchema;
        this.agents = [];
        this.messages = {};
        this.textQueue = new simple_queue_1.SimpleQueue(this.process.bind(this));
        this.listeners = {};
        // New messagesMap to store messages between parent and child agents
        this.messagesMap = {};
        this.agentsMap = {};
    }
    init() {
        console.log('[MainAgent.constructor] Agent started');
        this.initAgent(this.agentSchema);
    }
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    removeListener(event, listener) {
        if (!this.listeners[event])
            return;
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(...args));
        }
    }
    async initAgent(agentSchema) {
        const agent = (0, agent_factory_1.createAgentFactory)(agentSchema, undefined, this);
        this.addAgent(agent);
        await agent.init();
        return agent;
    }
    async process(item) {
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
        this.emit(enums_1.EAgentEvent.MESSAGES_MAP_UPDATED_FULL, { messages: this.messagesMap });
    }
    sendMessage(text, sender = 'user') {
        console.log(`[MainAgent.sendMessage] text: ${text}, sender: ${sender}`);
        this.textQueue.enqueue({
            text,
            sender,
            senderType: 'user',
            createdAt: new Date()
        });
    }
    getAgentSchema() {
        return {
            ...this.agentSchema,
            id: this.id,
        };
    }
    // Helper function to create a combined key
    getMessageKey(parentId, childId) {
        return `${parentId}:${childId}`;
    }
    /**
     * Adds a message to the messagesMap with a combined key of parentId:childId
     * @param parentId - The ID of the parent agent
     * @param childId - The ID of the child agent
     * @param messages - The messages to add
     */
    addMessages(parentId, childId, messages) {
        const key = this.getMessageKey(parentId, childId);
        if (!this.messagesMap[key]) {
            this.messagesMap[key] = [];
        }
        this.messagesMap[key].push(...messages);
        // check for overfill PROMPT_LAST_MESSAGES_N
        if (this.messagesMap[key].length > llm_1.PROMPT_LAST_MESSAGES_N) {
            console.log(`[MainAgent.addMessages] overfill PROMPT_LAST_MESSAGES_N, ${this.messagesMap[key].length}`);
            this.messagesMap[key] = this.messagesMap[key].slice(-llm_1.PROMPT_LAST_MESSAGES_N);
        }
        this.emit(enums_1.EAgentEvent.MESSAGES_UPDATED, { parentId, childId, messages: this.messagesMap[key] });
        this.emit(enums_1.EAgentEvent.MESSAGES_MAP_UPDATED_FULL, { messages: this.messagesMap });
    }
    /**
     * Retrieves messages from the messagesMap based on parentId and childId
     * @param parentId - The ID of the parent agent
     * @param childId - The ID of the child agent
     * @returns An array of messages
     */
    getMessages(parentId, childId) {
        const key = this.getMessageKey(parentId, childId);
        return this.messagesMap[key] || [];
    }
    getMessagesMap() {
        return this.messagesMap;
    }
    addAgent(agent) {
        this.agents.push(agent);
        this.agentsMap[agent.name] = agent;
    }
    getAgent(name) {
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
    getAgentByTabKey(tabKey) {
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
exports.MainAgent = MainAgent;
