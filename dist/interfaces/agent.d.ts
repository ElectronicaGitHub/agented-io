import { EAgentStatus } from '../enums';
import { IAgentFunctionDefinition, IMarketplaceFunctionDefinition } from './agent-function';
import { IAgentMessage } from './agent-message';
export interface IAgent {
    id: string;
    name: string;
    prompt: string;
    functions?: IAgentFunctionDefinition[];
    marketplaceFunctions?: IMarketplaceFunctionDefinition[];
    status: EAgentStatus;
    preRequestBuildPrompt(prompt: string, messages: string[]): Promise<string>;
    process(text: string, role: string): void;
    init(): Promise<void>;
    currentStatus: EAgentStatus;
    emit(event: string, ...args: any[]): void;
    setInitialMessages(messages: IAgentMessage[]): void;
    setCtx(ctx: any): void;
}
