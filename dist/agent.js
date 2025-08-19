"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const consts_1 = require("./consts");
const llm_processor_1 = require("./processors/llm-processor");
const file_utils_1 = require("./utils/file-utils");
const simple_queue_1 = require("./utils/simple-queue");
const agent_type_1 = require("./enums/agent-type");
const agent_event_1 = require("./enums/agent-event");
const node_schedule_1 = __importDefault(require("node-schedule"));
const enums_1 = require("./enums");
const prompt_polyfill_1 = require("./utils/prompt-polyfill");
const agent_factory_1 = require("./utils/agent-factory");
class Agent {
    get workTimeoutMs() {
        return this.agentSchema.workTimeout || this.DEFAULT_WORK_TIMEOUT;
    }
    get pingIntervalMs() {
        return this.agentSchema.pingInterval || this.DEFAULT_PING_INTERVAL;
    }
    get messages() {
        return this.mainAgent?.getMessages(this.parentAgent?.name || 'main', this.name) || [];
    }
    addMessages(messages) {
        if (this.mainAgent) {
            this.mainAgent.addMessages(this.parentAgent?.name || 'main', this.name, messages);
        }
        this.emit(agent_event_1.EAgentEvent.MESSAGES_UPDATED, { agentName: this.name, messages: this.messages });
    }
    constructor(id, agentSchema, parentAgent, mainAgent) {
        this.id = id;
        this.agentSchema = agentSchema;
        this.mainAgent = mainAgent;
        this.children = [];
        this.flowLength = 0;
        this.processQueue = new simple_queue_1.SimpleQueue(this.processItem.bind(this));
        this.ctx = {
            agentId: this.id,
            inputText: '',
            sender: '',
            agentName: '',
            updateCtx: this.updateCtx.bind(this),
        };
        this.status = enums_1.EAgentStatus.IDLE;
        this.DEFAULT_WORK_TIMEOUT = 60000; // 1 minute default timeout
        this.DEFAULT_PING_INTERVAL = 10000; // 10 seconds ping interval
        this.MULTIPLE_FUNCTIONS_TIMEOUT = 10000; // 10 seconds timeout for multiple functions execution
        this.listeners = {};
        this.resources = {
            timeouts: new Set(),
            intervals: new Map(),
        };
        this.name = agentSchema.name;
        this.prompt = agentSchema.prompt || '';
        this.splitPrompt = agentSchema.splitPrompt || { cacheable: '', nonCacheable: '' };
        this.functions = agentSchema.functions || [];
        this.functionsStoreService = agentSchema.functionsStoreService || {};
        this.llmProcessor = new llm_processor_1.LLMProcessor();
        this.processQueue = new simple_queue_1.SimpleQueue(this.processItem.bind(this));
        this.parentAgent = parentAgent;
        this.listeners = {};
    }
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => listener(...args));
        }
    }
    async getCombinedPromptWithFunctions() {
        let prompt = this.agentSchema.prompt || '';
        // reflection agent
        if (this.agentSchema.type === agent_type_1.EAgentType.REFLECTION) {
            const textPromptUsage = await (0, file_utils_1.readFileAsync)(consts_1.TEXT_PROMPT_USAGE, (0, consts_1.getPromptsDirectory)());
            const functionsExistensePrompt = await (0, file_utils_1.readFileAsync)(consts_1.FUNCTIONS_PROMPT_EXISTENSE, (0, consts_1.getPromptsDirectory)());
            const baseReflectionPrompt = await (0, file_utils_1.readFileAsync)(consts_1.BASE_REFLECTION_PROMPT, (0, consts_1.getPromptsDirectory)());
            const finalReflectionPrompt = (0, prompt_polyfill_1.inPromptReplacer)(baseReflectionPrompt, {
                [consts_1.PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER]: this.parentAgent?.getSpecialInstructions() || '',
            });
            prompt = [
                finalReflectionPrompt,
                functionsExistensePrompt,
                textPromptUsage,
            ].join('\n\n');
        }
        else {
            // permanent agent
            const functionsPrompt = await (0, file_utils_1.readFileAsync)(consts_1.FUNCTIONS_PROMPT, (0, consts_1.getPromptsDirectory)());
            const functionsPromptUsage = await (0, file_utils_1.readFileAsync)(consts_1.FUNCTIONS_PROMPT_USAGE, (0, consts_1.getPromptsDirectory)());
            const baseDeciderPrompt = await (0, file_utils_1.readFileAsync)(consts_1.BASE_DECIDER_PROMPT, (0, consts_1.getPromptsDirectory)());
            const baseDeciderDynamicPrompt = await (0, file_utils_1.readFileAsync)(consts_1.BASE_DECIDER_DYNAMIC_PROMPT, (0, consts_1.getPromptsDirectory)());
            prompt = [
                baseDeciderPrompt,
                functionsPrompt,
                functionsPromptUsage,
                baseDeciderDynamicPrompt,
            ].join('\n\n');
        }
        return prompt;
    }
    retrieveFunctionsFromAgent(agentSchema) {
        const mpFunctions = this.marketplaceFunctions?.map(fn => ({
            ...fn,
            paramsToPass: fn.paramsToPass,
        }));
        return [
            ...(agentSchema.functions || []),
            ...(mpFunctions || []),
        ];
    }
    async getFunctionsAndChildren() {
        /**
         * Agent should know what got it's parent
         */
        if (this.agentSchema.type === agent_type_1.EAgentType.REFLECTION && this.parentAgent) {
            const fns = this.retrieveFunctionsFromAgent(this.parentAgent.agentSchema);
            return {
                functions: fns,
                children: this.parentAgent.agentSchema.children || [],
            };
        }
        const fns2 = this.retrieveFunctionsFromAgent(this.agentSchema);
        return {
            functions: fns2,
            children: this.agentSchema.children || [],
        };
    }
    getSpecialInstructions() {
        return [
            this.agentSchema.prompt,
            this.agentSchema.flowInstructionPrompt,
        ].filter(Boolean).join('\n\n');
    }
    async init() {
        /**
         * Basic prompt polyfill
         */
        const combinedPrompt = await this.getCombinedPromptWithFunctions();
        const { functions, children } = await this.getFunctionsAndChildren();
        const specialInstructions = this.getSpecialInstructions();
        this.prompt = (0, prompt_polyfill_1.promptPolyfill)(combinedPrompt, {
            agentName: this.name,
            functions: functions,
            children: children,
            specialInstructions: specialInstructions,
        });
        await this.initSubagents(this.agentSchema.children || []);
        await this.initSubagents(this.agentSchema.reflections || []);
        /**
         * Scheduling reflection agent
         */
        if (this.agentSchema.type === agent_type_1.EAgentType.REFLECTION) {
            if (this.agentSchema.cronInitOnStart) {
                console.log(`[Agent ${this.name}] Initializing reflection agent ${this.name}`);
                this.process('', this.name);
            }
            if (consts_1.IS_USE_SCHEDULED_REFLECTION) {
                node_schedule_1.default.scheduleJob(this.agentSchema.cronSchedule || '* * * * *', () => {
                    console.log(`[Agent ${this.name}] Scheduling reflection agent ${this.name}`);
                    this.process('', this.name);
                });
            }
        }
        // Add event listeners
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        // Status change listener
        const statusListener = (statusChange) => {
            console.log(`[Agent ${this.name}] Status changed from ${statusChange.previousStatus} to ${statusChange.status}`);
        };
        this.on(agent_event_1.EAgentEvent.STATUS_CHANGED, statusListener);
        // Ping listener
        const pingListener = (pingData) => {
            console.log(`[Agent ${this.name}] Received PING from ${pingData.fromAgent}:`, pingData);
            this.emit(agent_event_1.EAgentEvent.PONG, {
                toAgent: pingData.fromAgent,
                status: this.status,
                progress: this.status === enums_1.EAgentStatus.WORKING ? "Working on task..." : "Ready",
                timestamp: new Date()
            });
        };
        this.on(agent_event_1.EAgentEvent.PING, pingListener);
        // Add REQUEST_LAST_RESPONSE handler
        const requestLastResponseListener = (request) => {
            console.log(`[Agent ${this.name}] Received REQUEST_LAST_RESPONSE from ${request.fromAgent}`);
            const lastMessage = this.messages[this.messages.length - 1];
            if (lastMessage) {
                this.emit(agent_event_1.EAgentEvent.PONG, {
                    fromAgent: this.name,
                    status: this.status,
                    response: lastMessage,
                    timestamp: new Date()
                });
            }
        };
        this.on(agent_event_1.EAgentEvent.REQUEST_LAST_RESPONSE, requestLastResponseListener);
        // Pong listener to handle responses from working children
        const pongListener = (pongData) => {
            console.log(`[Agent ${this.name}] Received PONG from ${pongData.fromAgent}:`, pongData);
            if (pongData.error) {
                this.process(pongData.error, pongData.fromAgent);
            }
            if (pongData.response) {
                // Check if this response has already been processed
                const isAlreadyProcessed = this.messages.some(msg => msg.text === pongData.response.text &&
                    msg.sender === pongData.response.sender &&
                    msg.createdAt.getTime() === pongData.response.createdAt.getTime());
                if (!isAlreadyProcessed) {
                    console.log(`[Agent ${this.name}] Processing response from previously working child: ${pongData.fromAgent}`);
                    this.process(pongData.response.text, pongData.fromAgent);
                }
                else {
                    console.log(`[Agent ${this.name}] Skipping already processed response from: ${pongData.fromAgent}`);
                }
            }
        };
        this.on(agent_event_1.EAgentEvent.PONG, pongListener);
    }
    async initAgent(agentSchema, parentAgent) {
        const agent = (0, agent_factory_1.createAgentFactory)(agentSchema, parentAgent, this.mainAgent);
        this.children.push(agent);
        this.mainAgent?.addAgent(agent);
        // Agent listens main agent response -> react to main agent response, with own process
        agent.on(agent_event_1.EAgentEvent.MAIN_RESPONSE, (result) => {
            console.log(`-------> [Agent ${this.name}] MAIN_RESPONSE: ${JSON.stringify(result)}`);
            // Check if this response should be batched
            if (!this.handleChildrenPendingResponses(result, agent.name)) {
                this.process(result.text, agent.name);
            }
        });
        // Agent listens it's reflection response -> react to reflection response, with own process
        agent.on(agent_event_1.EAgentEvent.REFLECTION_RESPONSE, (result) => {
            // console.log(`-------> [Agent ${this.name}] REFLECTION_RESPONSE: ${JSON.stringify(result)}`);
            this.process(result.text, result.sender);
        });
        // Agent listens children response
        agent.on(agent_event_1.EAgentEvent.RESPONSE, (response) => {
            console.log(`-------> [Agent ${this.name}] RESPONSE: ${JSON.stringify(response)}`);
            this.emit(agent_event_1.EAgentEvent.RESPONSE, response);
        });
        await agent.init();
        return agent;
    }
    /**
     * Public method to push text to process queue
     * @param inputText - The input text to process
     * @param sender - The name of the agent that created the input
     * @returns A promise that resolves to the result of the processing
     */
    process(inputText, sender = 'user', type = agent_type_1.EAgentResponseType.TEXT, functionName) {
        console.log(`[Agent ${this.name}] Received new task from ${sender}:`, {
            type,
            functionName: functionName || 'none',
            textLength: inputText?.length || 0,
            currentStatus: this.status
        });
        // Clear any existing processing
        this.cleanup();
        // Reset status to IDLE before starting new processing
        this.setStatus(enums_1.EAgentStatus.IDLE);
        this.processQueue.enqueue({
            text: inputText,
            sender,
            senderType: this.agentSchema.type,
            createdAt: new Date(),
            type,
            functionName,
        });
    }
    getMessagesAsText() {
        return this.messages.map(msg => `${msg.sender}: ${msg.text}`).slice(-consts_1.PROMPT_LAST_MESSAGES_N);
    }
    setMessages(messages) {
        this.addMessages(messages.map(el => ({
            ...el,
            contexted: true,
        })));
    }
    setInitialMessages(messages) {
        console.log(`[setInitialMessages] ${this.name}`, this.messages.length);
        if (this.messages.length)
            return;
        this.setMessages(messages);
    }
    setCtx(ctx) {
        this.ctx = ctx;
    }
    updateCtx(partialCtx) {
        this.ctx = {
            ...this.ctx,
            ...partialCtx,
        };
    }
    /**
     * Method to process the input text and return the result
     * @param item - The item to process
     * @returns A promise that resolves to the result of the processing
     */
    async processItem(item) {
        try {
            this.setStatus(enums_1.EAgentStatus.WORKING);
            console.log('\n\n\n\n');
            if (item.text) {
                console.log(`\n----> [Agent ${this.name}] ${this.id} Processing input: item.type: ${item.type} \n\n${item.text}\n\n`);
            }
            else {
                console.log(`\n----> [Agent ${this.name}] ${this.id} Processing empty input`);
            }
            // Initialize ctx with input details
            this.contextPolyfill(item);
            this.flowLength++;
            const mixinsResult = await this.processMixins();
            this.addMessages([item]);
            // console.log(`111 [${this.name}] Added message ${JSON.stringify(item)}`);
            // HERE WE BUILD SPLIT_PROMPT
            const prompt = await this.preRequestBuildPrompt(this.prompt, this.getMessagesAsText(), mixinsResult);
            const MAX_RETRIES = 3;
            let retryCount = 0;
            let response;
            while (retryCount < MAX_RETRIES) {
                try {
                    // console.log(`[Agent ${this.name}] Sending prompt to LLM (llmProcessor.getLLMResultSendMessage)`);
                    // console.log(`[Agent ${this.name}] prompt: ${prompt}`);
                    const { result, metadata } = await this.llmProcessor.getLLMResultSendMessage(this.splitPrompt);
                    // Validate response format
                    if (typeof result === 'string') {
                        console.log(`[Agent ${this.name}] Invalid response format (attempt ${retryCount + 1}/${MAX_RETRIES}):`, result);
                        retryCount++;
                        if (retryCount === MAX_RETRIES) {
                            throw new Error(`Failed to get valid response after ${MAX_RETRIES} attempts. Response was not an object.`);
                        }
                        continue;
                    }
                    // Handle array of functions response
                    if (Array.isArray(result)) {
                        console.log(`[Agent ${this.name}] Received array of functions:`, result);
                        response = {
                            type: agent_type_1.EAgentResponseType.MULTIPLE_FUNCTIONS,
                            functions: result,
                            finished: false,
                        };
                        break;
                    }
                    // Validate response has required type field
                    if (!result.type) {
                        console.log(`[Agent ${this.name}] Response missing type field (attempt ${retryCount + 1}/${MAX_RETRIES}):`, result);
                        retryCount++;
                        if (retryCount === MAX_RETRIES) {
                            throw new Error(`Failed to get valid response after ${MAX_RETRIES} attempts. Response missing type field.`);
                        }
                        continue;
                    }
                    response = result;
                    break;
                }
                catch (error) {
                    console.error(`[Agent ${this.name}] Error getting LLM response (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
                    retryCount++;
                    if (retryCount === MAX_RETRIES) {
                        throw error;
                    }
                }
            }
            if (!response) {
                throw new Error('Failed to get valid LLM response after all retries');
            }
            const { stopProcessing, result, agent } = await this.handleResponse(response);
            // console.log(`777, typeof result: ${typeof result} \n result: ${JSON.stringify(result, null, 2)}`);
            const event = this.buildResponseEvent(response, result);
            // console.log(`--> [Agent ${this.name}] PARSED RESPONSE: stopProcessing: ${stopProcessing} and result: ${JSON.stringify(result)}`);
            if (stopProcessing) {
                /**
                 * Here we respond to parent agent back
                 */
                if (this.parentAgent && this.agentSchema.type === agent_type_1.EAgentType.REFLECTION) {
                    // console.log(`--> [Agent ${this.name}] ENQUEUE reflection agent: ${JSON.stringify(event)}`);
                    this.emit(agent_event_1.EAgentEvent.REFLECTION_RESPONSE, event);
                }
                else {
                    // console.log(`--> [Agent ${this.name}] ENQUEUE regular agent: ${JSON.stringify(event)}`);
                    this.emit(agent_event_1.EAgentEvent.MAIN_RESPONSE, event);
                }
                this.addMessages([event]);
                // console.log(`222 [${this.name}] Added message: ${JSON.stringify(event)}`);
            }
            else {
                this.emit(agent_event_1.EAgentEvent.RESPONSE, event);
                console.log(`[Agent ${this.name}] event.type: ${event.type}`);
                /**
                 * Functional response should not be added to the messages
                 * because it's already added to the messages and here - it's the same
                 */
                const eventTypesWithoutMessages = [agent_type_1.EAgentResponseType.FUNCTION, agent_type_1.EAgentResponseType.AGENT, agent_type_1.EAgentResponseType.MULTIPLE_FUNCTIONS];
                if (event.type && !eventTypesWithoutMessages.includes(event.type)) {
                    this.addMessages([event]);
                    // console.log(`333 [${this.name}] Added message: ${JSON.stringify(event)}`);
                }
                if (event.commands?.length) {
                    this.addMessages([{
                            text: '',
                            commands: event.commands,
                            sender: this.name,
                            senderType: this.agentSchema.type,
                            createdAt: new Date(),
                            type: agent_type_1.EAgentResponseType.COMMAND,
                        }]);
                }
                /**
                 * If it's a function response - then just process it via the same agent
                 */
                if (event.type === agent_type_1.EAgentResponseType.FUNCTION) {
                    // here we pass type explicitly, to define correct messages
                    this.process(event.text, this.name, agent_type_1.EAgentResponseType.FUNCTION, event.functionName);
                }
                /**
                 * If it's a multiple functions response - then just process it via the same agent
                 */
                if (event.type === agent_type_1.EAgentResponseType.MULTIPLE_FUNCTIONS) {
                    // here we pass type explicitly, to define correct messages
                    this.process(event.text, this.name, agent_type_1.EAgentResponseType.MULTIPLE_FUNCTIONS, event.functionName);
                }
                /**
                 * If it's an agent response - then process it via the same agent
                 */
                if (event.type === agent_type_1.EAgentResponseType.AGENT) {
                    const agentRes = this.returnAsAgentResponse(response);
                    if (agent) {
                        console.log(`[Agent ${this.name}] Setting initial messages and ctx to agent ${agentRes.name}`);
                        agent.setInitialMessages(this.messages);
                        agent.setCtx(this.ctx);
                        agent.process(agentRes.specialInstructions, this.name);
                    }
                    else {
                        console.error(`[Agent ${this.name}] Agent ${agentRes.name} not found`);
                    }
                }
            }
            // Update status based on response
            if (stopProcessing) {
                this.setStatus(enums_1.EAgentStatus.IDLE);
            }
            else {
                this.setStatus(enums_1.EAgentStatus.WAITING);
            }
        }
        catch (error) {
            console.error(`Error in agent ${this.name}:`, error.message);
            this.setStatus(enums_1.EAgentStatus.ERROR, error.message);
            this.addMessages([{
                    text: error.message,
                    sender: this.name,
                    senderType: this.agentSchema.type,
                    createdAt: new Date(),
                    type: agent_type_1.EAgentResponseType.TEXT,
                }]);
        }
    }
    async preRequestBuildPrompt(prompt, messages, mixinsResult) {
        const childrenStatusInfo = this.getChildrenStatusInfo();
        const promptWithContext = (0, prompt_polyfill_1.inPromptReplacer)(prompt, {
            [consts_1.LAST_INPUT_FIELD_PROMPT_PLACEHOLDER]: this.ctx.inputText,
            [consts_1.CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER]: messages.join('\n'),
            [consts_1.MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER]: mixinsResult || '',
            [consts_1.CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER]: childrenStatusInfo,
        });
        console.log('promptWithContext', promptWithContext);
        const dynamicPrompt = promptWithContext.split(consts_1.DYNAMIC_PROMPT_SEPARATOR);
        this.splitPrompt = {
            cacheable: dynamicPrompt[0],
            nonCacheable: dynamicPrompt[1],
        };
        console.log('this.splitPrompt', this.splitPrompt);
        return promptWithContext;
    }
    contextPolyfill(item) {
        this.ctx = {
            ...this.ctx,
            inputText: item.text,
            sender: item.sender,
            agentName: this.name,
            messages: this.messages,
        };
    }
    buildResponseEvent(response, result) {
        // console.log(`[Agent ${this.name}] ---))))) buildResponseEvent response: ${JSON.stringify(response)} \n Typeof result: ${typeof result} \n Result: ${JSON.stringify(result)}`);
        const isCommandResult = Array.isArray(result);
        // console.log(`[Agent ${this.name}] ---))))) buildResponseEvent isCommandResult: ${isCommandResult}`);
        const text = isCommandResult ? result[0] : (result || '');
        const commands = isCommandResult ? result[1] : [];
        // console.log(`[Agent ${this.name}] ---))))) buildResponseEvent commands: ${JSON.stringify(commands)}`);
        let functionName = '';
        if (response.type === agent_type_1.EAgentResponseType.FUNCTION) {
            functionName = response.functionName || '';
        }
        else if (response.type === agent_type_1.EAgentResponseType.MULTIPLE_FUNCTIONS) {
            const multipleFuncRes = response;
            functionName = multipleFuncRes.functions.map(f => f.functionName).join(', ');
        }
        const event = {
            createdAt: new Date(),
            type: response.type,
            sender: this.name,
            senderType: this.agentSchema.type,
            text,
            commands,
            explanation: response.explanation || '',
            functionName,
            name: response.name || '',
            specialInstructions: response.specialInstructions || '',
            metadata: {
                inputTokens: this.ctx.inputText.length,
                outputTokens: text.length
            }
        };
        return event;
    }
    async handleResponse(response) {
        let result = '';
        // console.log(`[Agent ${this.name}] handleResponse response:\n\ntypeof response: ${typeof response} \n response: ${JSON.stringify(response)}`);
        /**
         * Function response
         */
        if (typeof response === 'string') {
            console.log('[Agent.parseResponse] STRING response');
            return { stopProcessing: true, result: response, type: agent_type_1.EAgentResponseType.TEXT };
        }
        const funcRes = this.returnAsFunctionalResponse(response);
        if (funcRes.type === agent_type_1.EAgentResponseType.FUNCTION) {
            console.log(`[Agent ${this.name}] Executing function: ${funcRes.functionName}`);
            result = await this.handleFunctionResponse(funcRes);
            // console.log(`[Agent ${this.name}] Function executed result -- \nTypeof result: ${typeof result} \n result: ${JSON.stringify(result)}`);
            // const isCommandResult = Array.isArray(result);
            // const text = isCommandResult ? result[0] : (result as string || '');
            // const commands = isCommandResult ? result[1] : null;
            // console.log(`[Agent ${this.name}] Function executed result Commands -- \nText: ${text} \n Typeof commands: ${typeof commands} \n commands: ${JSON.stringify(commands, null, 2)}`);
            return { stopProcessing: false, result, type: funcRes.type };
        }
        /**
         * Multiple functions response
         */
        const multipleFuncRes = this.returnAsMultipleFunctionsResponse(response);
        if (multipleFuncRes.type === agent_type_1.EAgentResponseType.MULTIPLE_FUNCTIONS) {
            console.log(`[Agent ${this.name}] Executing multiple functions: ${multipleFuncRes.functions.map(f => f.functionName).join(', ')}`);
            result = await this.handleMultipleFunctionsResponse(multipleFuncRes);
            return { stopProcessing: false, result, type: multipleFuncRes.type };
        }
        /**
         * Agent response
         */
        const agentRes = this.returnAsAgentResponse(response);
        if (agentRes.type === agent_type_1.EAgentResponseType.AGENT) {
            console.log(`[Agent ${this.name}] Finished processing, agentRes: ${agentRes.name}`);
            const agent = this.children.find(child => child.name === agentRes.name);
            console.log(`${this.name} this.children: ${JSON.stringify(this.children.map(child => child.name))}`);
            // Check if agent is already working
            if (agent && agent.currentStatus === enums_1.EAgentStatus.WORKING) {
                console.log(`[Agent ${this.name}] Agent ${agentRes.name} is already working, waiting for response`);
                return { stopProcessing: true, result: `Waiting for response from ${agentRes.name}`, type: agentRes.type };
            }
            return { stopProcessing: false, result: agentRes.name, type: agentRes.type, agent: agent };
        }
        /**
         * Text response
         */
        const textRes = this.returnAsTextResponse(response);
        if (textRes.type === agent_type_1.EAgentResponseType.TEXT) {
            console.log(`[Agent ${this.name}] Finished processing, textRes: ${textRes.text}`);
            this.flowLength = 0;
            return { stopProcessing: true, result: textRes.text, type: textRes.type };
        }
        /**
         * If not finished, continue processing
         */
        return { stopProcessing: false, result: textRes.text, type: textRes.type };
    }
    async handleFunctionResponse(funcRes) {
        const mpFunction = this.marketplaceFunctions?.find(el => el.name === funcRes.functionName);
        let result;
        result = await this.executeFunction(funcRes);
        /**
         * Handling the result from function, is it a string or an a CommandResult
         */
        const resultIsCommand = Array.isArray(result);
        // console.log(`[Agent ${this.name}] ---))))) handleFunctionResponse resultIsCommand: ${resultIsCommand} \n result: ${JSON.stringify(result)}`);
        if (resultIsCommand) {
            const resultWithCommands = this.returnAsCommandResult(result);
            const stringResponse = this.wrapFunctionTextResponse(funcRes, resultWithCommands);
            const commandResult = resultWithCommands[1];
            return [stringResponse, commandResult];
        }
        else {
            return this.wrapFunctionTextResponse(funcRes, result);
        }
    }
    async handleMultipleFunctionsResponse(multipleFuncRes) {
        console.log(`[Agent ${this.name}] Starting execution of ${multipleFuncRes.functions.length} functions`);
        const results = [];
        const promises = multipleFuncRes.functions.map(async (funcRes) => {
            try {
                const result = await this.handleFunctionResponse(funcRes);
                return this.wrapFunctionTextResponse(funcRes, result);
            }
            catch (error) {
                return `Error executing function ${funcRes.functionName}: ${error.message}`;
            }
        });
        try {
            // Execute all functions with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Functions execution timed out'));
                }, this.MULTIPLE_FUNCTIONS_TIMEOUT);
            });
            const executionPromise = Promise.all(promises);
            const functionResults = await Promise.race([executionPromise, timeoutPromise]);
            results.push(...functionResults);
        }
        catch (error) {
            if (error.message === 'Functions execution timed out') {
                results.push('Functions failed to execute within the specified time limit');
            }
            else {
                results.push(`Error executing multiple functions: ${error.message}`);
            }
        }
        return results.join('\n\n');
    }
    wrapFunctionTextResponse(funcRes, result) {
        const text = 'Fn Call Result: ';
        const resultIsText = typeof result === 'string';
        return [
            this.wrapFunctionCall(funcRes),
            `${text}${resultIsText ? result : JSON.stringify(result, null, 2)}`,
        ].filter(Boolean).join('\n');
    }
    async executeFunction(funcRes) {
        const functions = this.retrieveFunctionsFromAgent(this.agentSchema);
        try {
            if (functions) {
                const func = functions.find(func => func.name === funcRes.functionName)?.func;
                if (!func) {
                    throw new Error(`Function ${funcRes.functionName} not found`);
                }
                let result = '';
                const ctxData = {
                    ...this.ctx,
                };
                const args = funcRes.paramsToPass;
                const hasArgs = Object.keys(args).length;
                if (hasArgs) {
                    console.log(`[Agent ${this.name}] args: ${JSON.stringify(args)}`);
                    result = await func(args, ctxData);
                }
                else {
                    console.log(`[Agent ${this.name}] no args`);
                    result = await func(ctxData);
                }
                return result;
            }
            return '';
        }
        catch (error) {
            return error.message;
        }
    }
    wrapFunctionCall(funcRes) {
        const hasParams = funcRes.paramsToPass && Object.keys(funcRes.paramsToPass).length > 0;
        return `Fn Call ${funcRes.functionName}()${hasParams ? ` with params: ${JSON.stringify(funcRes.paramsToPass, null, 2)}` : ''}`;
    }
    async initSubagents(children) {
        if (children) {
            await Promise.all(children.map(childSchema => this.initAgent(childSchema, this)));
        }
    }
    async processMixins() {
        const mixins = this.agentSchema.mixins || [];
        if (mixins.length > 0) {
            const mixinsResult = await Promise.all(mixins.map(mixin => mixin.func(this.ctx)));
            return mixinsResult.join('\n');
        }
        return '';
    }
    returnAsFunctionalResponse(resp) {
        return resp;
    }
    returnAsTextResponse(resp) {
        return resp;
    }
    returnAsAgentResponse(resp) {
        return resp;
    }
    returnAsCommandResult(resp) {
        return resp;
    }
    returnAsMultipleFunctionsResponse(resp) {
        return resp;
    }
    handleChildrenPendingResponses(result, sender) {
        console.log(`[Agent ${this.name}] handleChildrenPendingResponses called with sender: ${sender}`);
        const senderAgent = this.children.find(child => child.name === sender);
        if (!senderAgent) {
            console.log(`[Agent ${this.name}] No sender agent found for ${sender}, returning false`);
            return false;
        }
        console.log(`[Agent ${this.name}] Found sender agent: ${senderAgent.name}`);
        // Clear any existing ping interval for this sender since we got their response
        const existingInterval = this.resources.intervals.get(sender);
        if (existingInterval) {
            clearInterval(existingInterval);
            this.resources.intervals.delete(sender);
            console.log(`[Agent ${this.name}] Cleared ping interval for ${sender} as response was received`);
        }
        // Process response after state updates have settled
        setTimeout(() => {
            // Check children statuses
            const childrenStatuses = this.checkChildrenStatuses();
            console.log(`[Agent ${this.name}] Current children statuses:`, Object.fromEntries(childrenStatuses));
            const workingChildren = Array.from(childrenStatuses.entries())
                .filter(([_, status]) => status === enums_1.EAgentStatus.WORKING)
                .map(([name]) => name);
            console.log(`[Agent ${this.name}] Working children count: ${workingChildren.length}`);
            console.log(`[Agent ${this.name}] Working children: ${workingChildren.join(', ') || 'none'}`);
            // Process current response with context about working children
            let responseText = result.text;
            if (workingChildren.length > 0) {
                responseText += `\nWaiting for response from: ${workingChildren.join(', ')}`;
                // Set up periodic pinging for working children
                workingChildren.forEach(childName => {
                    console.log(`[Agent ${this.name}] Setting up ping interval for child ${childName}`);
                    const pingInterval = setInterval(() => {
                        const child = this.children.find(c => c.name === childName);
                        console.log(`[Agent ${this.name}] Checking child ${childName} status in ping interval: ${child?.currentStatus}`);
                        if (!child || child.currentStatus !== enums_1.EAgentStatus.WORKING) {
                            console.log(`[Agent ${this.name}] Requesting last response from ${childName}`);
                            if (child) {
                                child.emit(agent_event_1.EAgentEvent.REQUEST_LAST_RESPONSE, {
                                    fromAgent: this.name,
                                    timestamp: new Date()
                                });
                            }
                            console.log(`[Agent ${this.name}] Clearing ping interval for ${childName}`);
                            clearInterval(pingInterval);
                            this.resources.intervals.delete(childName);
                            return;
                        }
                        console.log(`[Agent ${this.name}] Emitting PING event to ${childName}`);
                        child.emit(agent_event_1.EAgentEvent.PING, {
                            fromAgent: this.name,
                            timestamp: new Date()
                        });
                    }, this.pingIntervalMs);
                    console.log(`[Agent ${this.name}] Storing ping interval reference for ${childName}`);
                    this.resources.intervals.set(childName, pingInterval);
                });
            }
            // Process the response
            this.process(responseText, sender);
        }, 0);
        return true;
    }
    checkChildrenStatuses() {
        const statuses = new Map();
        this.children.forEach(child => {
            statuses.set(child.name, child.currentStatus);
        });
        return statuses;
    }
    cleanup() {
        console.log(`[Agent ${this.name}] Starting cleanup. Current status: ${this.status}`);
        this.resources.timeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
        this.resources.timeouts.clear();
        this.resources.intervals.forEach(interval => {
            clearInterval(interval);
        });
        this.resources.intervals.clear();
        // Clear work timeout
        if (this.workTimeout) {
            clearTimeout(this.workTimeout);
            this.workTimeout = undefined;
        }
        // Clear the process queue
        this.processQueue.clear();
        console.log(`[Agent ${this.name}] Cleanup completed`);
    }
    // Add status getter
    get currentStatus() {
        return this.status;
    }
    setStatus(newStatus, error) {
        const oldStatus = this.status;
        this.status = newStatus;
        // Handle ERROR state
        if (newStatus === enums_1.EAgentStatus.ERROR) {
            // 2. Notify parent
            if (this.parentAgent) {
                this.parentAgent.emit(agent_event_1.EAgentEvent.PONG, {
                    fromAgent: this.name,
                    status: enums_1.EAgentStatus.ERROR,
                    error: error,
                    timestamp: new Date()
                });
            }
            // 3. Stop processing queue
            this.processQueue.clear();
        }
        // Handle TIMEOUT state
        if (newStatus === enums_1.EAgentStatus.TIMEOUT) {
            this.cleanup();
            this.lastError = `Agent ${this.name} timed out after ${this.workTimeoutMs}ms`;
            this.setStatus(enums_1.EAgentStatus.ERROR, this.lastError);
            return;
        }
        // Set new timeout for WORKING status
        if (newStatus === enums_1.EAgentStatus.WORKING) {
            const timeout = setTimeout(() => {
                if (this.status === enums_1.EAgentStatus.WORKING) {
                    this.setStatus(enums_1.EAgentStatus.TIMEOUT);
                }
            }, this.workTimeoutMs);
            this.resources.timeouts.add(timeout);
            this.workTimeout = timeout;
        }
        // Emit status change event
        this.emit(agent_event_1.EAgentEvent.STATUS_CHANGED, {
            agentName: this.name,
            status: newStatus,
            previousStatus: oldStatus,
            error: this.lastError
        });
    }
    getChildrenStatusInfo() {
        if (!this.children || this.children.length === 0) {
            return 'No child agents available.';
        }
        const statusInfo = this.children.map(child => {
            const lastMessages = this.mainAgent?.getMessages(this.name, child.name)
                ?.slice(-3) // Get last 3 messages
                ?.map(msg => `  ${msg.sender}: ${msg.text}`)
                ?.join('\n') || 'No recent messages';
            return `${child.name}:\n  Status: ${child.currentStatus}\n  Recent activity:\n${lastMessages}`;
        }).join('\n\n');
        return `Child Agents Status:\n${statusInfo}`;
    }
}
exports.Agent = Agent;
