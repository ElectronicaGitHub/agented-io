import { 
  BASE_DECIDER_PROMPT, 
  BASE_REFLECTION_PROMPT, 
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER, 
  FUNCTIONS_PROMPT, 
  FUNCTIONS_PROMPT_EXISTENSE, 
  FUNCTIONS_PROMPT_USAGE, 
  IS_USE_SCHEDULED_REFLECTION, 
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER, 
  MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER, 
  PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER, 
  PROMPT_LAST_MESSAGES_N, 
  TEXT_PROMPT_USAGE,
  CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER,
  getPromptsDirectory,
  BASE_DECIDER_DYNAMIC_PROMPT,
  DYNAMIC_PROMPT_SEPARATOR
  } from './consts';
import { LLMProcessor } from './processors/llm-processor';
import { readFileAsync } from './utils/file-utils';
import { SimpleQueue } from './utils/simple-queue';
import { EAgentResponseType, EAgentType } from './enums/agent-type';
import { EAgentEvent } from './enums/agent-event';
import schedule from 'node-schedule';
import { MainAgent } from './main-agent';
import { EAgentStatus } from './enums';
import { inPromptReplacer, promptPolyfill } from './utils/prompt-polyfill';
import { 
  IAgent, 
  IAgentFunctionDefinition, 
  IMarketplaceFunctionDefinition,
  IAgentMessage,
  IAgentCtx,
  IAgentSchema,
  IAgentUnitedFunction,
  IUpdatedContext,
  IAgentResponse,
  IAgentFunctionResult,
  IAgentResponseFunction,
  IAgentResponseAgent,
  IFunctionExecutionCommandResult,
  IAgentResponseText,
  IAgentResponseMultipleFunctions,
  ISplitPrompt,
} from './interfaces';
import { IFunctionsStoreService } from './interfaces/functions-store-service.interface';
import { createAgentFactory } from './utils/agent-factory';

export type Middleware = (ctx: any) => Promise<void>;

export class Agent implements IAgent {
  name: string;
  prompt: string;
  splitPrompt: ISplitPrompt;
  parentAgent?: Agent;
  functions?: IAgentFunctionDefinition[];
  marketplaceFunctions?: IMarketplaceFunctionDefinition[];
  children: IAgent[] = [];
  llmProcessor: LLMProcessor;
  flowLength: number = 0;
  private processQueue: SimpleQueue<IAgentMessage> = new SimpleQueue(this.processItem.bind(this));
  protected ctx: IAgentCtx = {
    agentId: this.id,
    inputText: '',
    sender: '',
    agentName: '',
    updateCtx: this.updateCtx.bind(this),
  };
  functionsStoreService: IFunctionsStoreService;

  status: EAgentStatus = EAgentStatus.IDLE;
  private workTimeout?: NodeJS.Timeout;
  private readonly DEFAULT_WORK_TIMEOUT = 60000; // 1 minute default timeout
  private readonly DEFAULT_PING_INTERVAL = 10000; // 10 seconds ping interval
  private readonly MULTIPLE_FUNCTIONS_TIMEOUT = 10000; // 10 seconds timeout for multiple functions execution
  private lastError?: string;

  private listeners: { [key: string]: ((...args: any[]) => void)[] } = {};

  private resources: {
    timeouts: Set<NodeJS.Timeout>;
    intervals: Map<string, NodeJS.Timeout>;
  } = {
    timeouts: new Set(),
    intervals: new Map(),
  };

  private get workTimeoutMs(): number {
    return this.agentSchema.workTimeout || this.DEFAULT_WORK_TIMEOUT;
  }

  private get pingIntervalMs(): number {
    return this.agentSchema.pingInterval || this.DEFAULT_PING_INTERVAL;
  }

  get messages(): IAgentMessage[] {
    return this.mainAgent?.getMessages(this.parentAgent?.name || 'main', this.name) || [];
  }

  addMessages(messages: IAgentMessage[]) {
    if (this.mainAgent) {
      this.mainAgent.addMessages(this.parentAgent?.name || 'main', this.name, messages);
    }
    this.emit(EAgentEvent.MESSAGES_UPDATED, { agentName: this.name, messages: this.messages });
  }

  constructor(
    public id: string,
    private agentSchema: IAgentSchema,
    parentAgent?: Agent,
    private mainAgent?: MainAgent
  ) {
    this.name = agentSchema.name;
    this.prompt = agentSchema.prompt || '';
    this.splitPrompt = agentSchema.splitPrompt || { cacheable: '', nonCacheable: '' };
    this.functions = agentSchema.functions || [];
    this.functionsStoreService = agentSchema.functionsStoreService || {} as IFunctionsStoreService;

    this.llmProcessor = new LLMProcessor();
    this.processQueue = new SimpleQueue(this.processItem.bind(this));
    this.parentAgent = parentAgent;

    this.listeners = {};
  }

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(...args));
    }
  }

  private async getCombinedPromptWithFunctions(): Promise<string> {
    let prompt = this.agentSchema.prompt || '';
    // reflection agent
    if (this.agentSchema.type === EAgentType.REFLECTION) {
      const textPromptUsage = await readFileAsync(TEXT_PROMPT_USAGE, getPromptsDirectory());
      const functionsExistensePrompt = await readFileAsync(FUNCTIONS_PROMPT_EXISTENSE, getPromptsDirectory());
      const baseReflectionPrompt = await readFileAsync(BASE_REFLECTION_PROMPT, getPromptsDirectory());
      const finalReflectionPrompt = inPromptReplacer(baseReflectionPrompt, {
        [PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER]: this.parentAgent?.getSpecialInstructions() || '',
      });
      prompt = [
        finalReflectionPrompt,
        functionsExistensePrompt,
        textPromptUsage,
      ].join('\n\n');
    } else {
      // permanent agent
      const functionsPrompt = await readFileAsync(FUNCTIONS_PROMPT, getPromptsDirectory());
      const functionsPromptUsage = await readFileAsync(FUNCTIONS_PROMPT_USAGE, getPromptsDirectory());
      const baseDeciderPrompt = await readFileAsync(BASE_DECIDER_PROMPT, getPromptsDirectory());
      const baseDeciderDynamicPrompt = await readFileAsync(BASE_DECIDER_DYNAMIC_PROMPT, getPromptsDirectory());
      prompt = [
        baseDeciderPrompt,
        functionsPrompt,
        functionsPromptUsage,
        baseDeciderDynamicPrompt,
      ].join('\n\n');
    }
    return prompt;
  }


  private retrieveFunctionsFromAgent(agentSchema: IAgentSchema): IAgentFunctionDefinition[] {
    const mpFunctions = this.marketplaceFunctions?.map(fn => ({
      ...fn,
      paramsToPass: fn.paramsToPass,
    })) as IAgentFunctionDefinition[];

    return [
      ...(agentSchema.functions || []),
      ...(mpFunctions || []),
    ];
  }

  private async getFunctionsAndChildren(): Promise<{
    functions: IAgentUnitedFunction[], 
    children: IAgentSchema[],
  }> {
    /**
     * Agent should know what got it's parent
     */
    if (this.agentSchema.type === EAgentType.REFLECTION && this.parentAgent) {
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

  getSpecialInstructions(): string {
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

    this.prompt = promptPolyfill(combinedPrompt, {
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
    if (this.agentSchema.type === EAgentType.REFLECTION) {
      if (this.agentSchema.cronInitOnStart) {
        console.log(`[Agent ${this.name}] Initializing reflection agent ${this.name}`);
        this.process('', this.name);
      }
      if (IS_USE_SCHEDULED_REFLECTION) {
        schedule.scheduleJob(this.agentSchema.cronSchedule || '* * * * *', () => {
          console.log(`[Agent ${this.name}] Scheduling reflection agent ${this.name}`);
          this.process('', this.name);
        });
      }
    }

    // Add event listeners
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Status change listener
    const statusListener = (statusChange: any) => {
      console.log(`[Agent ${this.name}] Status changed from ${statusChange.previousStatus} to ${statusChange.status}`);
    };
    this.on(EAgentEvent.STATUS_CHANGED, statusListener);

    // Ping listener
    const pingListener = (pingData: any) => {
      console.log(`[Agent ${this.name}] Received PING from ${pingData.fromAgent}:`, pingData);
      this.emit(EAgentEvent.PONG, {
        toAgent: pingData.fromAgent,
        status: this.status,
        progress: this.status === EAgentStatus.WORKING ? "Working on task..." : "Ready",
        timestamp: new Date()
      });
    };
    this.on(EAgentEvent.PING, pingListener);

    // Add REQUEST_LAST_RESPONSE handler
    const requestLastResponseListener = (request: any) => {
      console.log(`[Agent ${this.name}] Received REQUEST_LAST_RESPONSE from ${request.fromAgent}`);
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage) {
        this.emit(EAgentEvent.PONG, {
          fromAgent: this.name,
          status: this.status,
          response: lastMessage,
          timestamp: new Date()
        });
      }
    };
    this.on(EAgentEvent.REQUEST_LAST_RESPONSE, requestLastResponseListener);

    // Pong listener to handle responses from working children
    const pongListener = (pongData: any) => {
      console.log(`[Agent ${this.name}] Received PONG from ${pongData.fromAgent}:`, pongData);

      if (pongData.error) {
        this.process(pongData.error, pongData.fromAgent);
      }
      
      if (pongData.response) {
        // Check if this response has already been processed
        const isAlreadyProcessed = this.messages.some(msg => 
          msg.text === pongData.response.text && 
          msg.sender === pongData.response.sender &&
          msg.createdAt.getTime() === pongData.response.createdAt.getTime()
        );
        
        if (!isAlreadyProcessed) {
          console.log(`[Agent ${this.name}] Processing response from previously working child: ${pongData.fromAgent}`);
          this.process(pongData.response.text, pongData.fromAgent);
        } else {
          console.log(`[Agent ${this.name}] Skipping already processed response from: ${pongData.fromAgent}`);
        }
      }
    };
    this.on(EAgentEvent.PONG, pongListener);
  }

  async initAgent(agentSchema: IAgentSchema, parentAgent?: IAgent): Promise<IAgent> {
    const agent = createAgentFactory(agentSchema, parentAgent, this.mainAgent);

    this.children.push(agent);
    this.mainAgent?.addAgent(agent);

    // Agent listens main agent response -> react to main agent response, with own process
    agent.on(EAgentEvent.MAIN_RESPONSE, (result: IAgentMessage) => {
      console.log(`-------> [Agent ${this.name}] MAIN_RESPONSE: ${JSON.stringify(result)}`);
      
      // Check if this response should be batched
      if (!this.handleChildrenPendingResponses(result, agent.name)) {
        this.process(result.text, agent.name);
      }
    });

    // Agent listens it's reflection response -> react to reflection response, with own process
    agent.on(EAgentEvent.REFLECTION_RESPONSE, (result: IAgentMessage) => {
      // console.log(`-------> [Agent ${this.name}] REFLECTION_RESPONSE: ${JSON.stringify(result)}`);
      this.process(result.text, result.sender);
    });

    // Agent listens children response
    agent.on(EAgentEvent.RESPONSE, (response: IAgentMessage) => {
      console.log(`-------> [Agent ${this.name}] RESPONSE: ${JSON.stringify(response)}`);
      this.emit(EAgentEvent.RESPONSE, response);
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
  process(inputText: string, sender: string = 'user', type: EAgentResponseType = EAgentResponseType.TEXT, functionName?: string): void {
    console.log(`[Agent ${this.name}] Received new task from ${sender}:`, {
      type,
      functionName: functionName || 'none',
      textLength: inputText?.length || 0,
      currentStatus: this.status
    });
    
    // Clear any existing processing
    this.cleanup();
    
    // Reset status to IDLE before starting new processing
    this.setStatus(EAgentStatus.IDLE);
    
    this.processQueue.enqueue({ 
      text: inputText,
      sender,
      senderType: this.agentSchema.type,
      createdAt: new Date(),
      type,
      functionName,
    });
  }

  getMessagesAsText(): string[] {
    return this.messages.map(msg => `${msg.sender}: ${msg.text}`).slice(-PROMPT_LAST_MESSAGES_N);
  }

  setMessages(messages: IAgentMessage[]) {
    this.addMessages(messages.map(el => ({
      ...el,
      contexted: true,
    })));
  }

  setInitialMessages(messages: IAgentMessage[]) {
    console.log(`[setInitialMessages] ${this.name}`, this.messages.length);
    if (this.messages.length) return;
    this.setMessages(messages);
  }

  setCtx(ctx: any) {
    this.ctx = ctx;
  }

  updateCtx(partialCtx: IUpdatedContext) {
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
  private async processItem(item: IAgentMessage): Promise<void> {
    try {
      this.setStatus(EAgentStatus.WORKING);
      
      console.log('\n\n\n\n');
      if (item.text) {
        console.log(`\n----> [Agent ${this.name}] ${this.id} Processing input: item.type: ${item.type} \n\n${item.text}\n\n`);
      } else {
        console.log(`\n----> [Agent ${this.name}] ${this.id} Processing empty input`);
      }

      // Initialize ctx with input details
      this.contextPolyfill(item);

      this.flowLength++;

      const mixinsResult = await this.processMixins();

      this.addMessages([item]);
      // console.log(`111 [${this.name}] Added message ${JSON.stringify(item)}`);


      // HERE WE BUILD SPLIT_PROMPT
      const prompt = await this.preRequestBuildPrompt(
        this.prompt, 
        this.getMessagesAsText(),
        mixinsResult,
      );

      const MAX_RETRIES = 3;
      let retryCount = 0;
      let response: IAgentResponse | undefined;

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
              type: EAgentResponseType.MULTIPLE_FUNCTIONS,
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
        } catch (error) {
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
        if (this.parentAgent && this.agentSchema.type === EAgentType.REFLECTION) {
          // console.log(`--> [Agent ${this.name}] ENQUEUE reflection agent: ${JSON.stringify(event)}`);
          this.emit(EAgentEvent.REFLECTION_RESPONSE, event);
        } else {
          // console.log(`--> [Agent ${this.name}] ENQUEUE regular agent: ${JSON.stringify(event)}`);
          this.emit(EAgentEvent.MAIN_RESPONSE, event);
        }

        this.addMessages([event]);
        // console.log(`222 [${this.name}] Added message: ${JSON.stringify(event)}`);
      } else {
        this.emit(EAgentEvent.RESPONSE, event);
        console.log(`[Agent ${this.name}] event.type: ${event.type}`);
        /**
         * Functional response should not be added to the messages
         * because it's already added to the messages and here - it's the same
         */
        const eventTypesWithoutMessages = [EAgentResponseType.FUNCTION, EAgentResponseType.AGENT, EAgentResponseType.MULTIPLE_FUNCTIONS];
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
            type: EAgentResponseType.COMMAND,
          }]);
        }

        /**
         * If it's a function response - then just process it via the same agent
         */
        if (event.type === EAgentResponseType.FUNCTION) {
          // here we pass type explicitly, to define correct messages
          this.process(event.text, this.name, EAgentResponseType.FUNCTION, event.functionName);
        }
        /**
         * If it's a multiple functions response - then just process it via the same agent
         */
        if (event.type === EAgentResponseType.MULTIPLE_FUNCTIONS) {
          // here we pass type explicitly, to define correct messages
          this.process(event.text, this.name, EAgentResponseType.MULTIPLE_FUNCTIONS, event.functionName);
        }
        /**
         * If it's an agent response - then process it via the same agent
         */
        if (event.type === EAgentResponseType.AGENT) {
          const agentRes = this.returnAsAgentResponse(response);
          if (agent) {
            console.log(`[Agent ${this.name}] Setting initial messages and ctx to agent ${agentRes.name}`);
            agent.setInitialMessages(this.messages);
            agent.setCtx(this.ctx);
            agent.process(agentRes.specialInstructions, this.name);
          } else {
            console.error(`[Agent ${this.name}] Agent ${agentRes.name} not found`);
          }
        }
      }

      // Update status based on response
      if (stopProcessing) {
        this.setStatus(EAgentStatus.IDLE);
      } else {
        this.setStatus(EAgentStatus.WAITING);
      }
    } catch (error: any) {
      console.error(`Error in agent ${this.name}:`, error.message);
      this.setStatus(EAgentStatus.ERROR, error.message);
      this.addMessages([{
        text: error.message,
        sender: this.name,
        senderType: this.agentSchema.type,
        createdAt: new Date(),
        type: EAgentResponseType.TEXT,
      }]);
    }
  }

  public async preRequestBuildPrompt(prompt: string, messages: string[], mixinsResult?: string): Promise<string> {
    const childrenStatusInfo = this.getChildrenStatusInfo();
    const promptWithContext = inPromptReplacer(prompt, {
      [LAST_INPUT_FIELD_PROMPT_PLACEHOLDER]: this.ctx.inputText,
      [CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER]: messages.join('\n'),
      [MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER]: mixinsResult || '',
      [CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER]: childrenStatusInfo,
    });

    console.log('promptWithContext', promptWithContext);
    const dynamicPrompt = promptWithContext.split(DYNAMIC_PROMPT_SEPARATOR);
    this.splitPrompt = {
      cacheable: dynamicPrompt[0],
      nonCacheable: dynamicPrompt[1],
    }
    console.log('this.splitPrompt', this.splitPrompt);

    return promptWithContext;
  }

  private contextPolyfill(item: IAgentMessage): void {
    this.ctx = {
      ...this.ctx,
      inputText: item.text,
      sender: item.sender,
      agentName: this.name,
      messages: this.messages,
    };
  }

  private buildResponseEvent(response: IAgentResponse, result?: IAgentFunctionResult): IAgentMessage {
    // console.log(`[Agent ${this.name}] ---))))) buildResponseEvent response: ${JSON.stringify(response)} \n Typeof result: ${typeof result} \n Result: ${JSON.stringify(result)}`);
    const isCommandResult = Array.isArray(result);
    // console.log(`[Agent ${this.name}] ---))))) buildResponseEvent isCommandResult: ${isCommandResult}`);
    const text = isCommandResult ? result[0] : (result || '') as string;
    const commands = isCommandResult ? result[1] : [];
    // console.log(`[Agent ${this.name}] ---))))) buildResponseEvent commands: ${JSON.stringify(commands)}`);
    
    let functionName = '';
    if (response.type === EAgentResponseType.FUNCTION) {
      functionName = (response as IAgentResponseFunction).functionName || '';
    } else if (response.type === EAgentResponseType.MULTIPLE_FUNCTIONS) {
      const multipleFuncRes = response as IAgentResponseMultipleFunctions;
      functionName = multipleFuncRes.functions.map(f => f.functionName).join(', ');
    }
    
    const event: IAgentMessage = {
      createdAt: new Date(),
      type: response.type,
      sender: this.name,
      senderType: this.agentSchema.type,
      text,
      commands,
      explanation: response.explanation || '',
      functionName,
      name: (response as IAgentResponseAgent).name || '',
      specialInstructions: (response as IAgentResponseAgent).specialInstructions || '',
      metadata: {
        inputTokens: this.ctx.inputText.length,
        outputTokens: text.length
      }
    };
    return event;
  }

  private async handleResponse(response: IAgentResponse): Promise<{ 
    stopProcessing: boolean, 
    result?: IAgentFunctionResult,
    type?: EAgentResponseType,
    agent?: IAgent,
  }> {
    let result: IAgentFunctionResult = '';

    // console.log(`[Agent ${this.name}] handleResponse response:\n\ntypeof response: ${typeof response} \n response: ${JSON.stringify(response)}`);
    /**
     * Function response
     */
    if (typeof response === 'string') {
      console.log('[Agent.parseResponse] STRING response');
      return { stopProcessing: true, result: response, type: EAgentResponseType.TEXT };
    }

    const funcRes = this.returnAsFunctionalResponse(response);
    if (funcRes.type === EAgentResponseType.FUNCTION) {
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
    if (multipleFuncRes.type === EAgentResponseType.MULTIPLE_FUNCTIONS) {
      console.log(`[Agent ${this.name}] Executing multiple functions: ${multipleFuncRes.functions.map(f => f.functionName).join(', ')}`);
      result = await this.handleMultipleFunctionsResponse(multipleFuncRes);
      return { stopProcessing: false, result, type: multipleFuncRes.type };
    }

    /**
     * Agent response
     */
    const agentRes = this.returnAsAgentResponse(response);
    if (agentRes.type === EAgentResponseType.AGENT) {
      console.log(`[Agent ${this.name}] Finished processing, agentRes: ${agentRes.name}`);

      const agent = this.children.find(child => child.name === agentRes.name);
      console.log(`${this.name} this.children: ${JSON.stringify(this.children.map(child => child.name))}`);

      // Check if agent is already working
      if (agent && agent.currentStatus === EAgentStatus.WORKING) {
        console.log(`[Agent ${this.name}] Agent ${agentRes.name} is already working, waiting for response`);
        return { stopProcessing: true, result: `Waiting for response from ${agentRes.name}`, type: agentRes.type };
      }

      return { stopProcessing: false, result: agentRes.name, type: agentRes.type, agent: agent };
    }
    
    /**
     * Text response
     */
    const textRes = this.returnAsTextResponse(response);
    if (textRes.type === EAgentResponseType.TEXT) {
      console.log(`[Agent ${this.name}] Finished processing, textRes: ${textRes.text}`);
      this.flowLength = 0;
      return { stopProcessing: true, result: textRes.text, type: textRes.type };
    }

    /**
     * If not finished, continue processing
     */
    return { stopProcessing: false, result: textRes.text, type: textRes.type };
  }

  private async handleFunctionResponse(funcRes: IAgentResponseFunction): Promise<IAgentFunctionResult> {
    const mpFunction = this.marketplaceFunctions?.find(el => el.name === funcRes.functionName);

    let result: IAgentFunctionResult;
    
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
    } else {
      return this.wrapFunctionTextResponse(funcRes, result);
    }
  }

  private async handleMultipleFunctionsResponse(multipleFuncRes: IAgentResponseMultipleFunctions): Promise<IAgentFunctionResult> {
    console.log(`[Agent ${this.name}] Starting execution of ${multipleFuncRes.functions.length} functions`);
    
    const results: string[] = [];
    const promises = multipleFuncRes.functions.map(async (funcRes) => {
      try {
        const result = await this.handleFunctionResponse(funcRes);
        return this.wrapFunctionTextResponse(funcRes, result);
      } catch (error: any) {
        return `Error executing function ${funcRes.functionName}: ${error.message}`;
      }
    });

    try {
      // Execute all functions with timeout
      const timeoutPromise = new Promise<string[]>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Functions execution timed out'));
        }, this.MULTIPLE_FUNCTIONS_TIMEOUT);
      });

      const executionPromise = Promise.all(promises);
      
      const functionResults = await Promise.race([executionPromise, timeoutPromise]) as string[];
      results.push(...functionResults);
    } catch (error: any) {
      if (error.message === 'Functions execution timed out') {
        results.push('Functions failed to execute within the specified time limit');
      } else {
        results.push(`Error executing multiple functions: ${error.message}`);
      }
    }

    return results.join('\n\n');
  }

  private wrapFunctionTextResponse(
    funcRes: IAgentResponseFunction, 
    result: IAgentFunctionResult,
  ): string {
    const text = 'Fn Call Result: ';
    const resultIsText = typeof result === 'string';
    return [
      this.wrapFunctionCall(funcRes),
      `${text}${resultIsText ? result : JSON.stringify(result, null, 2)}`,
    ].filter(Boolean).join('\n');
  }
  
  private async executeFunction(funcRes: IAgentResponseFunction): Promise<IAgentFunctionResult> {
    const functions = this.retrieveFunctionsFromAgent(this.agentSchema);

    try {
      if (functions) {
        const func = functions.find(func => func.name === funcRes.functionName)?.func;
        if (!func) {
          throw new Error(`Function ${funcRes.functionName} not found`);
        }
        
        let result: IAgentFunctionResult = '';
        const ctxData = {
          ...this.ctx,
        }
        
        const args = funcRes.paramsToPass;
        const hasArgs = Object.keys(args).length;
        
        if (hasArgs) {
          console.log(`[Agent ${this.name}] args: ${JSON.stringify(args)}`);
          result = await func(args, ctxData);
        } else {
          console.log(`[Agent ${this.name}] no args`);
          result = await func(ctxData);
        }

        return result;
      }
      return '';
    } catch (error: any) {
      return error.message;
    }
  }

  private wrapFunctionCall(funcRes: IAgentResponseFunction): string {
    const hasParams = funcRes.paramsToPass && Object.keys(funcRes.paramsToPass).length > 0;
    return `Fn Call ${funcRes.functionName}()${hasParams ? ` with params: ${JSON.stringify(funcRes.paramsToPass, null, 2)}` : ''}`;
  }

  private async initSubagents(children: IAgentSchema[]): Promise<void> {
    if (children) {
      await Promise.all(children.map(childSchema => this.initAgent(childSchema, this as IAgent)));
    }
  }

  private async processMixins(): Promise<string> {
    const mixins = this.agentSchema.mixins || [];
    if (mixins.length > 0) {
      const mixinsResult = await Promise.all(mixins.map(mixin => mixin.func(this.ctx)));
      return mixinsResult.join('\n');
    }
    return '';
  }

  private returnAsFunctionalResponse(resp: IAgentResponse): IAgentResponseFunction {
    return resp as IAgentResponseFunction;
  }
  private returnAsTextResponse(resp: IAgentResponse): IAgentResponseText {
    return resp as IAgentResponseText;
  }
  private returnAsAgentResponse(resp: IAgentResponse): IAgentResponseAgent {
    return resp as IAgentResponseAgent;
  }

  private returnAsCommandResult(resp: IAgentFunctionResult): IFunctionExecutionCommandResult {
    return resp as IFunctionExecutionCommandResult;
  }

  private returnAsMultipleFunctionsResponse(resp: IAgentResponse): IAgentResponseMultipleFunctions {
    return resp as IAgentResponseMultipleFunctions;
  }

  private handleChildrenPendingResponses(result: IAgentMessage, sender: string): boolean {
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
        .filter(([_, status]) => status === EAgentStatus.WORKING)
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
            
            if (!child || child.currentStatus !== EAgentStatus.WORKING) {
              console.log(`[Agent ${this.name}] Requesting last response from ${childName}`);
              if (child) {
                child.emit(EAgentEvent.REQUEST_LAST_RESPONSE, {
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
            child.emit(EAgentEvent.PING, {
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

  private checkChildrenStatuses(): Map<string, EAgentStatus> {
    const statuses = new Map<string, EAgentStatus>();
    this.children.forEach(child => {
      statuses.set(child.name, child.currentStatus);
    });
    return statuses;
  }

  private cleanup() {
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
  get currentStatus(): EAgentStatus {
    return this.status;
  }

  private setStatus(newStatus: EAgentStatus, error?: string) {
    const oldStatus = this.status;
    this.status = newStatus;
    
    // Handle ERROR state
    if (newStatus === EAgentStatus.ERROR) {
      // 2. Notify parent
      if (this.parentAgent) {
        this.parentAgent.emit(EAgentEvent.PONG, {
          fromAgent: this.name,
          status: EAgentStatus.ERROR,
          error: error,
          timestamp: new Date()
        });
      }

      // 3. Stop processing queue
      this.processQueue.clear();
    }

    // Handle TIMEOUT state
    if (newStatus === EAgentStatus.TIMEOUT) {
      this.cleanup();
      this.lastError = `Agent ${this.name} timed out after ${this.workTimeoutMs}ms`;
      this.setStatus(EAgentStatus.ERROR, this.lastError);
      return;
    }

    // Set new timeout for WORKING status
    if (newStatus === EAgentStatus.WORKING) {
      const timeout = setTimeout(() => {
        if (this.status === EAgentStatus.WORKING) {
          this.setStatus(EAgentStatus.TIMEOUT);
        }
      }, this.workTimeoutMs);
      
      this.resources.timeouts.add(timeout);
      this.workTimeout = timeout;
    }

    // Emit status change event
    this.emit(EAgentEvent.STATUS_CHANGED, {
      agentName: this.name,
      status: newStatus,
      previousStatus: oldStatus,
      error: this.lastError
    });
  }

  private getChildrenStatusInfo(): string {
    if (!this.children || this.children.length === 0) {
      return 'No child agents available.';
    }

    const statusInfo = this.children.map(child => {
      const lastMessages = this.mainAgent?.getMessages(this.name, child.name)
        ?.slice(-3)  // Get last 3 messages
        ?.map(msg => `  ${msg.sender}: ${msg.text}`)
        ?.join('\n') || 'No recent messages';

      return `${child.name}:\n  Status: ${child.currentStatus}\n  Recent activity:\n${lastMessages}`;
    }).join('\n\n');

    return `Child Agents Status:\n${statusInfo}`;
  }
}
