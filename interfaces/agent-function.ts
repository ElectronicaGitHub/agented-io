import { IAgentCommand } from './agent-command';
import { IMarketplaceUserFunction } from './marketplace-user-function';

export interface IAgentFunctionDefinition {
  func: (...args: any[]) => IFunctionExecutionResult;
  name: string;
  description: string;
  paramsToPass?: Record<string, string>;
  privateParamsToPass?: Record<string, string>;
  exampleOutput?: any;
}

export interface IMarketplaceFunctionDefinition {
  name: string;
  description: string;
  paramsToPass?: IMarketplaceUserFunction['paramsToPass'];
  privateParamsToPass?: IMarketplaceUserFunction['privateParamsToPass'];
  privateParams?: IMarketplaceUserFunction['privateParams'];
}

export type IAgentFunctionResult = string | IFunctionExecutionCommandResult;
export type IFunctionExecutionCommandResult = [string, IAgentCommand[]];
export type IFunctionExecutionResult = any | IFunctionExecutionCommandResult;
