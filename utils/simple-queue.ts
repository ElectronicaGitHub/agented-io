export class SimpleQueue<T> {
  private queue: T[] = [];
  private isProcessing: boolean = false;
  private currentAbortController?: AbortController;
  private currentProcessingItem?: T;

  constructor(private processItem: (item: T, signal: AbortSignal) => Promise<any>) {}

  enqueue(item: T) {
    // Cancel current processing if any
    if (this.isProcessing && this.currentProcessingItem) {
      this.cancelCurrentProcessing();
    }
    
    // Clear the queue and add new item
    if (this.queue.length > 0) {
      console.log('Queue: Clearing existing queue with items:', this.queue);
    }
    this.queue = [item];
    this.processNext();
  }

  clear() {
    if (this.isProcessing && this.currentProcessingItem) {
      this.cancelCurrentProcessing();
    }
    this.queue = [];
    this.isProcessing = false;
  }

  private cancelCurrentProcessing() {
    if (this.currentAbortController) {
      console.log('Queue: Aborting current processing');
      this.currentAbortController.abort();
      this.currentAbortController = undefined;
      this.currentProcessingItem = undefined;
    }
    this.isProcessing = false;
  }

  private async processNext() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const item = this.queue.shift()!;
    this.currentProcessingItem = item;
    
    // Create new abort controller for this processing
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    try {
      // Wrap the processItem in a promise that can be aborted
      await Promise.race([
        this.processItem(item, signal),
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('Processing cancelled'));
          });
        })
      ]);
    } catch (error: any) {
      if (error?.message === 'Processing cancelled') {
        // console.log('Queue: Processing was cancelled for item:', this.currentProcessingItem);
      } else {
        console.error('Queue: Error processing item:', error);
      }
    } finally {
      this.currentAbortController = undefined;
      this.currentProcessingItem = undefined;
      this.isProcessing = false;
      
      // Only process next if we weren't cancelled
      if (!signal.aborted) {
        this.processNext();
      }
    }
  }
}
 