"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericItemsStore = void 0;
const file_utils_1 = require("./file-utils");
class GenericItemsStore {
    constructor(filePath, maxItems, readyCallback) {
        this.readyCallback = readyCallback;
        this.items = [];
        this.filePath = filePath;
        this.maxItems = maxItems;
        this.init();
    }
    async removeItem(id) {
        console.log('[GenericItemsStore] removeItem] id: ', id);
        this.items = this.items.filter(item => item.id !== id);
        console.log('[GenericItemsStore] removeItem] this.items: ', this.items);
        await (0, file_utils_1.saveJsonToFileAsync)(this.filePath, this.items);
    }
    refreshData() {
        this.items = [];
        this.init();
    }
    async init() {
        this.items = await (0, file_utils_1.getJsonFromFileAsync)(this.filePath, []);
        console.log(`Initialized GenericStore, file: ${this.filePath}, items: ${this.items.length}`);
        if (this.readyCallback) {
            this.readyCallback(this.items);
        }
    }
    enforceItemLimit() {
        if (this.maxItems && this.items.length > this.maxItems) {
            // remain last N items
            this.items = this.items.slice(-this.maxItems);
        }
    }
    async addItem(item) {
        this.items.push(item);
        this.enforceItemLimit();
        await (0, file_utils_1.saveJsonToFileAsync)(this.filePath, this.items);
    }
    async addItems(items) {
        this.items.push(...items);
        this.enforceItemLimit();
        await (0, file_utils_1.saveJsonToFileAsync)(this.filePath, this.items);
    }
    async unshiftItem(item) {
        this.items.unshift(item);
        this.enforceItemLimit();
        await (0, file_utils_1.saveJsonToFileAsync)(this.filePath, this.items);
    }
    async updateItem(id, updates) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            this.items[index] = { ...this.items[index], ...updates };
            await (0, file_utils_1.saveJsonToFileAsync)(this.filePath, this.items);
        }
        return this.items[index];
    }
    getItem(id) {
        return this.items.find(item => item.id === id);
    }
    getAllItems() {
        return this.items;
    }
    /**
     * Clears all items from the store.
     */
    async clear() {
        this.items = [];
        await (0, file_utils_1.saveJsonToFileAsync)(this.filePath, this.items);
    }
}
exports.GenericItemsStore = GenericItemsStore;
