import { IMarketplaceFunctionDefinition } from './agent-function';
import { IMarketplaceUserFunction } from './marketplace-user-function';

export interface IFunctionsStoreService {
  getFunctionsByName(names: string[]): IMarketplaceFunctionDefinition[];
  addItemUpsertCallback(callback: (fn: IMarketplaceUserFunction) => void): void;
  clearItemUpsertCallbacks(): void;
  reset(): Promise<void>;
}