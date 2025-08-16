export declare class GenericItemsStore<T extends {
    id: string;
}> {
    private readyCallback?;
    private filePath;
    private items;
    /**
     * -N - last N items
     * N - first N items
     */
    private maxItems?;
    constructor(filePath: string, maxItems?: number, readyCallback?: ((data: T[]) => void) | undefined);
    removeItem(id: string): Promise<void>;
    refreshData(): void;
    private init;
    private enforceItemLimit;
    addItem(item: T): Promise<void>;
    addItems(items: T[]): Promise<void>;
    unshiftItem(item: T): Promise<void>;
    updateItem(id: string, updates: Partial<T>): Promise<T | undefined>;
    getItem(id: string): T | undefined;
    getAllItems(): T[];
    /**
     * Clears all items from the store.
     */
    clear(): Promise<void>;
}
