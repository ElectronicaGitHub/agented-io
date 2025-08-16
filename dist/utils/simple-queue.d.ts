export declare class SimpleQueue<T> {
    private processItem;
    private queue;
    private isProcessing;
    private currentAbortController?;
    private currentProcessingItem?;
    constructor(processItem: (item: T) => Promise<any>);
    enqueue(item: T): void;
    clear(): void;
    private cancelCurrentProcessing;
    private processNext;
}
