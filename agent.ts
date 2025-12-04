import { 
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER, 
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER, 
  MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER, 
  PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER, 
  CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER,
  DYNAMIC_PROMPT_SEPARATOR
  } from './consts';
import { validateCustomPrompt } from './utils/prompt-validation';
import { 
  BASE_DECIDER_PROMPT_TEMPLATE,
  BASE_DECIDER_DYNAMIC_PROMPT_TEMPLATE,
  FUNCTIONS_PROMPT_TEMPLATE,
  FUNCTIONS_PROMPT_USAGE_TEMPLATE,
  BASE_REFLECTION_PROMPT_TEMPLATE,
  FUNCTIONS_PROMPT_EXISTENCE_TEMPLATE,
  TEXT_PROMPT_USAGE_TEMPLATE,
} from './prompts-ts';
import { LLMProcessor } from './processors/llm-processor';
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
  IAgentMixin,
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
  ILLMUsageMetadata,
} from './interfaces';
import { IFunctionsStoreService } from './interfaces/functions-store-service.interface';
import { createAgentFactory } from './utils/agent-factory';

export type Middleware = (ctx: any) => Promise<void>;

export class Agent implements IAgent {
  name: string;
  prompt: string;
  /**
   * Split prompt for caching optimization. Generated dynamically before each LLM request
   * by splitting the prompt at DYNAMIC_PROMPT_SEPARATOR.
   */
  splitPrompt: ISplitPrompt;
  parentAgent?: Agent;
  functions?: IAgentFunctionDefinition[];
  marketplaceFunctions?: IMarketplaceFunctionDefinition[];
  children: IAgent[] = [];
  llmProcessor: LLMProcessor;
  flowLength: number = 0;
  private processQueue: SimpleQueue<IAgentMessage> = new SimpleQueue((item, signal) => this.processItem(item, signal));
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
    const defaultTimeout = this.mainAgent?.envConfig?.DEFAULT_WORK_TIMEOUT ?? 60000;
    return this.agentSchema.workTimeout || defaultTimeout;
  }

  private get pingIntervalMs(): number {
    const defaultInterval = this.mainAgent?.envConfig?.DEFAULT_PING_INTERVAL ?? 10000;
    return this.agentSchema.pingInterval || defaultInterval;
  }

  private get maxRetries(): number {
    return this.mainAgent?.envConfig?.LLM_MAX_RETRIES ?? 3;
  }

  private get retryDelayMs(): number {
    return this.mainAgent?.envConfig?.LLM_RETRY_DELAY_MS ?? 1000;
  }

  private get maxNumberOfTriesInFlow(): number {
    return this.mainAgent?.envConfig?.MAX_NUMBER_OF_TRIES_IN_FLOW ?? 5;
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
    this.splitPrompt = { cacheable: '', nonCacheable: '' };
    this.functions = agentSchema.functions || [];
    this.functionsStoreService = agentSchema.functionsStoreService || {} as IFunctionsStoreService;

    this.llmProcessor = new LLMProcessor(
      this.mainAgent ? () => this.mainAgent!.getEnvConfig() : undefined,
      (data) => {
        console.log('[Agent] status event callback', data);
        this.emit(EAgentEvent.LLM_STATUS_ERROR, data);
      }
    );
    this.processQueue = new SimpleQueue((item, signal) => this.processItem(item, signal));
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
    // If custom prompt is provided, validate and use it
    if (this.agentSchema.customPrompt) {
      console.log(`[Agent ${this.name}] Using custom prompt`);
      
      // Validate custom prompt (strict mode - will throw on error)
      validateCustomPrompt(this.agentSchema.customPrompt, true);
      
      return this.agentSchema.customPrompt;
    }

    let prompt = this.agentSchema.prompt || '';
    // reflection agent
    if (this.agentSchema.type === EAgentType.REFLECTION) {
      const finalReflectionPrompt = inPromptReplacer(BASE_REFLECTION_PROMPT_TEMPLATE, {
        [PARENT_AGENT_SPECIAL_INSTRUCTIONS_FIELD_PROMPT_PLACEHOLDER]: this.parentAgent?.getSpecialInstructions() || '',
      });
      prompt = [
        finalReflectionPrompt,
        FUNCTIONS_PROMPT_EXISTENCE_TEMPLATE,
        TEXT_PROMPT_USAGE_TEMPLATE,
      ].join('\n\n');
    } else {
      // permanent agent - use TypeScript prompts
      prompt = [
        BASE_DECIDER_PROMPT_TEMPLATE,
        FUNCTIONS_PROMPT_TEMPLATE,
        FUNCTIONS_PROMPT_USAGE_TEMPLATE,
        BASE_DECIDER_DYNAMIC_PROMPT_TEMPLATE,
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
      const isUseScheduledReflection = this.mainAgent?.envConfig?.IS_USE_SCHEDULED_REFLECTION ?? false;
      if (isUseScheduledReflection) {
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
      // console.log(`[Agent ${this.name}] Status changed from ${statusChange.previousStatus} to ${statusChange.status}`);
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
      // Check if this response should be batched
      if (!this.handleChildrenPendingResponses(result, agent.name)) {
        this.process(result.text, agent.name);
      }
    });

    // Agent listens it's reflection response -> react to reflection response, with own process
    agent.on(EAgentEvent.REFLECTION_RESPONSE, (result: IAgentMessage) => {
      this.process(result.text, result.sender);
    });

    // Agent listens children response
    agent.on(EAgentEvent.RESPONSE, (response: IAgentMessage) => {
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

  retryLastItem(): void {
    console.log(`[Agent ${this.name}] Retrying last processed item`);
  
    this.cleanup();
    this.setStatus(EAgentStatus.IDLE);
    
    this.processQueue.enqueue({
      text: '',
      sender: '',
      senderType: this.agentSchema.type,
      createdAt: new Date(),
    });
  }

  getMessagesAsText(): string[] {
    const limit = this.mainAgent?.envConfig.PROMPT_LAST_MESSAGES_N || 15;
    return this.messages.map(msg => `${msg.sender}: ${msg.text}`).slice(-limit);
  }

  setMixin(mixin: IAgentMixin, clear: boolean = false): void {
    const mixins = (clear 
      ? [] 
      : this.agentSchema.mixins
    ) || [];
    mixins.push(mixin);
    this.agentSchema.mixins = mixins;
  }

  clearMixins(): void {
    this.agentSchema.mixins = [];
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
  private async processItem(item: IAgentMessage, signal: AbortSignal): Promise<void> {
    try {
      this.setStatus(EAgentStatus.WORKING);
    
      // Initialize ctx with input details
      this.contextPolyfill(item);

      this.flowLength++;

      // Check if we exceeded max number of tries in flow
      if (this.flowLength > this.maxNumberOfTriesInFlow) {
        throw new Error(`Max number of tries in flow exceeded (${this.maxNumberOfTriesInFlow}). Agent may be stuck in an infinite loop.`);
      }

      const mixinsResult = await this.processMixins();

      this.addMessages([item]);

      this.splitPrompt = await this.preRequestBuildSplitPrompt(
        this.prompt, 
        this.getMessagesAsText(),
        mixinsResult,
      );

      let retryCount = 0;
      let response: IAgentResponse | undefined;
      let metadata: ILLMUsageMetadata = {
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        nonCachedTokens: 0,
        modelUsed: ''
      };

      while (retryCount < this.maxRetries) {
        try {
          const llmResult = await this.llmProcessor.getLLMResultSendMessage(this.splitPrompt, false, signal);
          const { result, metadata: llmMetadata } = llmResult;
          metadata = llmMetadata;
          
          // Validate response format
          if (typeof result === 'string') {
            console.log(`[Agent ${this.name}] Invalid response format (attempt ${retryCount + 1}/${this.maxRetries}):`, result);
            retryCount++;
            if (retryCount === this.maxRetries) {
              throw new Error(`Failed to get valid response after ${this.maxRetries} attempts. Response was not an object.`);
            }
            // Add delay before retry
            if (retryCount < this.maxRetries) {
              await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
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
            console.log(`[Agent ${this.name}] Response missing type field (attempt ${retryCount + 1}/${this.maxRetries}):`, result);
            retryCount++;
            if (retryCount === this.maxRetries) {
              throw new Error(`Failed to get valid response after ${this.maxRetries} attempts. Response missing type field.`);
            }
            // Add delay before retry
            if (retryCount < this.maxRetries) {
              await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
            }
            continue;
          }

          response = result;
          break;
        } catch (error: any & { shouldStopRetry?: boolean }) {
          console.error(`[Agent ${this.name}] Error getting LLM response (attempt ${retryCount + 1}/${this.maxRetries}):`);

          if (error?.shouldStopRetry) {
            throw error;
          }

          retryCount++;
          if (retryCount === this.maxRetries) {
            throw error;
          }
          // Add delay before retry
          if (retryCount < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
          }
        }
      }

      if (!response) {
        throw new Error('Failed to get valid LLM response after all retries');
      }
      
      const { stopProcessing, result, agent } = await this.handleResponse(response);
      const event = this.buildResponseEvent(response, result, metadata);


      if (stopProcessing) {
        /**
         * Here we respond to parent agent back
         */
        if (this.parentAgent && this.agentSchema.type === EAgentType.REFLECTION) {
          this.emit(EAgentEvent.REFLECTION_RESPONSE, event);
        } else {
          this.emit(EAgentEvent.MAIN_RESPONSE, event);
        }

        this.addMessages([event]);
      } else {
        this.emit(EAgentEvent.RESPONSE, event);
        // console.log(`[Agent ${this.name}] event.type: ${event.type}`);
        /**
         * Functional response should not be added to the messages
         * because it's already added to the messages and here - it's the same
         */
        const eventTypesWithoutMessages = [EAgentResponseType.FUNCTION, EAgentResponseType.AGENT, EAgentResponseType.MULTIPLE_FUNCTIONS];
        if (event.type && !eventTypesWithoutMessages.includes(event.type)) {
          this.addMessages([event]);
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
      if (this.mainAgent?.envConfig.ADD_ERRORS_TO_MESSAGES) {
        this.addMessages([{
          text: error.message,
          sender: this.name,
          senderType: this.agentSchema.type,
          createdAt: new Date(),
          type: EAgentResponseType.TEXT,
        }]);
      }
    }
  }

  public async preRequestBuildSplitPrompt(prompt: string, messages: string[], mixinsResult?: string): Promise<ISplitPrompt> {
    const childrenStatusInfo = this.getChildrenStatusInfo();
    const promptWithContext = inPromptReplacer(prompt, {
      [LAST_INPUT_FIELD_PROMPT_PLACEHOLDER]: this.ctx.inputText,
      [CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER]: messages.join('\n'),
      [MIXINS_RESULT_FIELD_PROMPT_PLACEHOLDER]: mixinsResult || '',
      [CHILDREN_STATUS_FIELD_PROMPT_PLACEHOLDER]: childrenStatusInfo,
    });

    const dynamicPrompt = promptWithContext.split(DYNAMIC_PROMPT_SEPARATOR);
    const cacheable = dynamicPrompt[0] ?? '';
    const nonCacheable = dynamicPrompt[1] ?? '';
    
    return {
      cacheable,
      nonCacheable,
    };
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

  private buildResponseEvent(response: IAgentResponse, result?: IAgentFunctionResult, metadata?: ILLMUsageMetadata): IAgentMessage {
    const isCommandResult = Array.isArray(result);
    const text = isCommandResult ? result[0] : (result || '') as string;
    const commands = isCommandResult ? result[1] : [];
    
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
      metadata,
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
    /**
     * Function response
     */
    if (typeof response === 'string') {
      return { stopProcessing: true, result: response, type: EAgentResponseType.TEXT };
    }

    const funcRes = this.returnAsFunctionalResponse(response);
    if (funcRes.type === EAgentResponseType.FUNCTION) {
      console.log(`[Agent ${this.name}] Executing function: ${funcRes.functionName}`);
      result = await this.handleFunctionResponse(funcRes);
      
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
      const agent = this.children.find(child => child.name === agentRes.name);

      // Check if agent is already working
      if (agent && agent.currentStatus === EAgentStatus.WORKING) {
        return { stopProcessing: true, result: `Waiting for response from ${agentRes.name}`, type: agentRes.type };
      }

      return { stopProcessing: false, result: agentRes.name, type: agentRes.type, agent: agent };
    }
    
    /**
     * Text response
     */
    const textRes = this.returnAsTextResponse(response);
    if (textRes.type === EAgentResponseType.TEXT) {
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
      console.log(`[Agent ${this.name}] Starting function: ${funcRes.functionName}`);
      const startTime = Date.now();
      try {
        const result = await this.handleFunctionResponse(funcRes);
        console.log(`[Agent ${this.name}] Completed function: ${funcRes.functionName} in ${Date.now() - startTime}ms`);
        return this.wrapFunctionTextResponse(funcRes, result);
      } catch (error: any) {
        console.log(`[Agent ${this.name}] Failed function: ${funcRes.functionName} after ${Date.now() - startTime}ms - Error: ${error.message}`);
        return `Error executing function ${funcRes.functionName}: ${error.message}`;
      }
    });

    try {
      // Execute all functions with timeout
      const timeoutPromise = new Promise<string[]>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Functions execution timed out'));
        }, this.mainAgent?.envConfig?.MULTIPLE_FUNCTIONS_TIMEOUT || 10000);
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
    const senderAgent = this.children.find(child => child.name === sender);
    if (!senderAgent) {
      return false;
    }

    // Clear any existing ping interval for this sender since we got their response
    const existingInterval = this.resources.intervals.get(sender);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.resources.intervals.delete(sender);
    }

    // Process response after state updates have settled
    setTimeout(() => {
      // Check children statuses
      const childrenStatuses = this.checkChildrenStatuses();
      
      const workingChildren = Array.from(childrenStatuses.entries())
        .filter(([_, status]) => status === EAgentStatus.WORKING)
        .map(([name]) => name);

      // Process current response with context about working children
      let responseText = result.text;
      if (workingChildren.length > 0) {
        responseText += `\nWaiting for response from: ${workingChildren.join(', ')}`;
        
        // Set up periodic pinging for working children
        workingChildren.forEach(childName => {
          const pingInterval = setInterval(() => {
            const child = this.children.find(c => c.name === childName);
            
            if (!child || child.currentStatus !== EAgentStatus.WORKING) {
              if (child) {
                child.emit(EAgentEvent.REQUEST_LAST_RESPONSE, {
                  fromAgent: this.name,
                  timestamp: new Date()
                });
              }
              clearInterval(pingInterval);
              this.resources.intervals.delete(childName);
              return;
            }
            
            child.emit(EAgentEvent.PING, {
              fromAgent: this.name,
              timestamp: new Date()
            });
          }, this.pingIntervalMs);

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
    // console.log(`[Agent ${this.name}] Starting cleanup. Current status: ${this.status}`);
  
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
