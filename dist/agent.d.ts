import { LLMProcessor } from './processors/llm-processor';
import { EAgentResponseType } from './enums/agent-type';
import { MainAgent } from './main-agent';
import { EAgentStatus } from './enums';
import { IAgent, IAgentFunctionDefinition, IMarketplaceFunctionDefinition, IAgentMessage, IAgentCtx, IAgentSchema, IUpdatedContext, ISplitPrompt } from './interfaces';
import { IFunctionsStoreService } from './interfaces/functions-store-service.interface';
export type Middleware = (ctx: any) => Promise<void>;
export declare class Agent implements IAgent {
    id: string;
    private agentSchema;
    private mainAgent?;
    name: string;
    prompt: string;
    splitPrompt: ISplitPrompt;
    parentAgent?: Agent;
    functions?: IAgentFunctionDefinition[];
    marketplaceFunctions?: IMarketplaceFunctionDefinition[];
    children: IAgent[];
    llmProcessor: LLMProcessor;
    flowLength: number;
    private processQueue;
    protected ctx: IAgentCtx;
    functionsStoreService: IFunctionsStoreService;
    status: EAgentStatus;
    private workTimeout?;
    private readonly DEFAULT_WORK_TIMEOUT;
    private readonly DEFAULT_PING_INTERVAL;
    private readonly MULTIPLE_FUNCTIONS_TIMEOUT;
    private lastError?;
    private listeners;
    private resources;
    private get workTimeoutMs();
    private get pingIntervalMs();
    get messages(): IAgentMessage[];
    addMessages(messages: IAgentMessage[]): void;
    constructor(id: string, agentSchema: IAgentSchema, parentAgent?: Agent, mainAgent?: MainAgent | undefined);
    on(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    private getCombinedPromptWithFunctions;
    private retrieveFunctionsFromAgent;
    private getFunctionsAndChildren;
    getSpecialInstructions(): string;
    init(): Promise<void>;
    private initializeEventListeners;
    initAgent(agentSchema: IAgentSchema, parentAgent?: IAgent): Promise<IAgent>;
    /**
     * Public method to push text to process queue
     * @param inputText - The input text to process
     * @param sender - The name of the agent that created the input
     * @returns A promise that resolves to the result of the processing
     */
    process(inputText: string, sender?: string, type?: EAgentResponseType, functionName?: string): void;
    getMessagesAsText(): string[];
    setMessages(messages: IAgentMessage[]): void;
    setInitialMessages(messages: IAgentMessage[]): void;
    setCtx(ctx: any): void;
    updateCtx(partialCtx: IUpdatedContext): void;
    /**
     * Method to process the input text and return the result
     * @param item - The item to process
     * @returns A promise that resolves to the result of the processing
     */
    private processItem;
    preRequestBuildPrompt(prompt: string, messages: string[], mixinsResult?: string): Promise<string>;
    private contextPolyfill;
    private buildResponseEvent;
    private handleResponse;
    private handleFunctionResponse;
    private handleMultipleFunctionsResponse;
    private wrapFunctionTextResponse;
    private executeFunction;
    private wrapFunctionCall;
    private initSubagents;
    private processMixins;
    private returnAsFunctionalResponse;
    private returnAsTextResponse;
    private returnAsAgentResponse;
    private returnAsCommandResult;
    private returnAsMultipleFunctionsResponse;
    private handleChildrenPendingResponses;
    private checkChildrenStatuses;
    private cleanup;
    get currentStatus(): EAgentStatus;
    private setStatus;
    private getChildrenStatusInfo;
}
