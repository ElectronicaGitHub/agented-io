"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekConnector = void 0;
const openai_1 = __importDefault(require("openai"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const consts_1 = require("../consts");
class DeepSeekConnector {
    constructor() {
        this.client = new openai_1.default({
            baseURL: 'https://api.deepseek.com',
            apiKey: consts_1.DEEPSEEK_KEY,
        });
        this.systemPrompt = null;
    }
    async sendChatMessage(prompt, model = consts_1.DEEPSEEK_MODEL, signal) {
        if (typeof prompt === 'string') {
            console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${model}`, prompt.length);
        }
        else {
            console.log(`[DeepSeekConnector.sendChatMessage] Sending request to ${model}`, prompt.cacheable.length, prompt.nonCacheable.length);
        }
        try {
            let response;
            if (typeof prompt === 'string') {
                response = await this.client.chat.completions.create({
                    model: model,
                    messages: [{
                            role: 'user',
                            content: prompt
                        }]
                }, { signal });
            }
            else {
                response = await this.client.chat.completions.create({
                    model: model,
                    messages: [
                        { role: 'system', content: prompt.cacheable },
                        { role: 'user', content: prompt.nonCacheable }
                    ],
                }, { signal });
            }
            console.log('[Anthropic Connector] response.usage', response.usage);
            const result = response.choices[0].message.content;
            return { result: result };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { error: 'Request aborted' };
            }
            console.error('Error calling DeepSeek:', error.message);
            return { error: 'Error calling DeepSeek' };
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
            this.systemPrompt = null;
        }
    }
    async createChatCompletion(prompt, systemPromptFilename, signal) {
        console.log('[DeepSeekConnector.createChatCompletion] Starting chat completion');
        await this.loadSystemPrompt(systemPromptFilename);
        const messages = [];
        if (this.systemPrompt) {
            messages.push({
                role: 'system',
                content: this.systemPrompt
            });
        }
        messages.push({
            role: 'user',
            content: prompt
        });
        try {
            const response = await this.client.chat.completions.create({
                model: consts_1.DEEPSEEK_MODEL,
                messages: messages
            }, { signal });
            const result = response.choices[0].message.content;
            console.log(`[DeepSeekConnector.createChatCompletion] Got response of length ${result?.length || 0}`);
            return { result: result };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { error: 'Request aborted' };
            }
            console.error('Error in DeepSeek chat completion:', error.message);
            return { error: 'Error in DeepSeek chat completion' };
        }
    }
}
exports.DeepSeekConnector = DeepSeekConnector;
