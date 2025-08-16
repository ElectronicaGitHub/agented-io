import { saveJsonToFileAsync, getJsonFromFileAsync } from './file-utils';

export class GenericItemsStore<T extends { id: string }> {
  private filePath: string;
  private items: T[] = [];
  /**
   * -N - last N items
   * N - first N items
   */
  private maxItems?: number;

  constructor(filePath: string, maxItems?: number, private readyCallback?: (data: T[]) => void) {
    this.filePath = filePath;
    this.maxItems = maxItems;
    this.init();
  }

  async removeItem(id: string) {
    console.log('[GenericItemsStore] removeItem] id: ', id);
    this.items = this.items.filter(item => item.id !== id);
    console.log('[GenericItemsStore] removeItem] this.items: ', this.items);
    await saveJsonToFileAsync(this.filePath, this.items);
  }

  refreshData() {
    this.items = [];
    this.init();
  }

  private async init() {
    this.items = await getJsonFromFileAsync<T[]>(this.filePath, []);
    console.log(`Initialized GenericStore, file: ${this.filePath}, items: ${this.items.length}`);
    if (this.readyCallback) {
      this.readyCallback(this.items);
    }
  }

  private enforceItemLimit(): void {
    if (this.maxItems && this.items.length > this.maxItems) {
      // remain last N items
      this.items = this.items.slice(-this.maxItems);
    }
  }

  async addItem(item: T): Promise<void> {
    this.items.push(item);
    this.enforceItemLimit();
    await saveJsonToFileAsync(this.filePath, this.items);
  }

  async addItems(items: T[]): Promise<void> {
    this.items.push(...items);
    this.enforceItemLimit();
    await saveJsonToFileAsync(this.filePath, this.items);
  }

  async unshiftItem(item: T): Promise<void> {
    this.items.unshift(item);
    this.enforceItemLimit();
    await saveJsonToFileAsync(this.filePath, this.items);
  }

  async updateItem(id: string, updates: Partial<T>): Promise<T | undefined> {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updates };
      await saveJsonToFileAsync(this.filePath, this.items);
    }
    return this.items[index];
  }

  getItem(id: string): T | undefined {
    return this.items.find(item => item.id === id);
  }

  getAllItems(): T[] {
    return this.items;
  }

  /**
   * Clears all items from the store.
   */
  async clear(): Promise<void> {
    this.items = [];
    await saveJsonToFileAsync(this.filePath, this.items);
  }
} 