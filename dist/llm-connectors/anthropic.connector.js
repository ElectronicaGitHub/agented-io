"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicConnector = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const consts_1 = require("../consts");
class AnthropicConnector {
    constructor() {
        this.systemPrompt = null;
        this.maxRetries = consts_1.ANTHROPIC_MAX_RETRIES;
        this.retryDelay = consts_1.ANTHROPIC_DELAY_MS;
        this.client = new sdk_1.default({
            apiKey: consts_1.ANTHROPIC_API_KEY,
        });
    }
    async sendChatMessage(prompt, model = consts_1.ANTHROPIC_MODEL, signal) {
        if (typeof prompt === 'string') {
            console.log('[Anthropic Connector] prompt length', prompt.length);
        }
        else {
            console.log('[Anthropic Connector] split prompt', prompt.cacheable.length, prompt.nonCacheable.length);
        }
        try {
            let response;
            if (typeof prompt === 'string') {
                response = await this.client.messages.create({
                    model: model,
                    max_tokens: 4000,
                    system: [
                        {
                            type: 'text',
                            text: prompt,
                            cache_control: { type: 'ephemeral' }
                        }
                    ],
                    messages: [{ role: 'user', content: prompt }],
                }, { signal });
            }
            else {
                response = await this.client.messages.create({
                    model: model,
                    max_tokens: 4000,
                    system: [
                        {
                            type: 'text',
                            text: prompt.cacheable,
                            cache_control: { type: 'ephemeral' }
                        }
                    ],
                    messages: [{ role: 'user', content: prompt.nonCacheable }],
                }, { signal });
            }
            console.log('[Anthropic Connector] response.usage', response.usage);
            const textResult = response.content[0].text;
            return { result: textResult };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { error: 'Request aborted' };
            }
            console.error('Error calling Anthropic:', error);
            return { error: 'Error calling Anthropic' };
        }
    }
    async loadSystemPrompt(systemPromptFilename) {
        try {
            const filePath = path_1.default.join(systemPromptFilename);
            this.systemPrompt = await promises_1.default.readFile(filePath, 'utf-8');
            console.log('System prompt loaded successfully');
            console.log(`System prompt length: ${this.systemPrompt.length} characters`);
        }
        catch (error) {
            console.error('Error loading system prompt:', error);
            throw error;
        }
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async createChatCompletion(userPrompt, systemPromptFilename, signal) {
        await this.loadSystemPrompt(systemPromptFilename);
        if (!this.systemPrompt) {
            return { error: 'Failed to load system prompt' };
        }
        console.log(`User prompt length: ${userPrompt.length} characters`);
        let currentDelay = this.retryDelay;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`Calling Anthropic API (Attempt ${attempt})`);
                const response = await this.client.messages.create({
                    model: consts_1.ANTHROPIC_MODEL,
                    max_tokens: 4000,
                    system: [
                        {
                            type: 'text',
                            text: this.systemPrompt,
                            cache_control: { type: 'ephemeral' }
                        }
                    ],
                    messages: [{ role: 'user', content: userPrompt }],
                }, { signal });
                console.log('Calling Anthropic API finished');
                const textResult = response.content[0].text;
                console.log(`Response length: ${textResult.length} characters`);
                // Log cache performance metrics if available
                if ('cache_creation_input_tokens' in response && 'cache_read_input_tokens' in response) {
                    console.log(`[Anthropic Connector] Cache creation tokens: ${response.cache_creation_input_tokens}`);
                    console.log(`[Anthropic Connector] Cache read tokens: ${response.cache_read_input_tokens}`);
                }
                return { result: textResult };
            }
            catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return { error: 'Request aborted' };
                }
                console.error(`Error calling Anthropic (Attempt ${attempt}):`, error.message);
                // Check for specific error types that warrant retry
                const shouldRetry = error.message.includes('Overloaded') ||
                    error.message.includes('rate_limit') ||
                    error.message.includes('timeout') ||
                    (error.status >= 500 && error.status < 600);
                if (shouldRetry && attempt < this.maxRetries) {
                    console.log(`Retrying in ${currentDelay / 1000} seconds...`);
                    await this.delay(currentDelay);
                    // Exponential backoff with max delay cap
                    currentDelay = Math.min(currentDelay * 2, 30000); // Max 30 seconds
                }
                else {
                    return { error: `Error calling Anthropic API: ${error.message}` };
                }
            }
        }
        return { error: 'Max retries reached. Failed to call Anthropic API.' };
    }
}
exports.AnthropicConnector = AnthropicConnector;
