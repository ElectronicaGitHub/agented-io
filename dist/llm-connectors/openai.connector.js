"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIConnector = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const openai_1 = require("openai");
const consts_1 = require("../consts");
class OpenAIConnector {
    constructor(assistantId) {
        this.assistantId = assistantId;
        this.client = new openai_1.OpenAI({
            apiKey: consts_1.OPENAI_KEY,
        });
        this.systemPrompt = null;
    }
    async sendChatMessage(prompt, model = consts_1.OPENAI_MODEL, signal) {
        try {
            const response = await this.client.chat.completions.create({
                model: model,
                messages: [{
                        role: 'user',
                        content: prompt
                    }]
            }, { signal });
            const result = response.choices[0].message.content;
            return { result: result };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return { error: 'Request aborted' };
            }
            console.error('Error calling OpenAI:', error);
            return { error: 'Error calling OpenAI' };
        }
    }
    async createChatCompletion(content, systemPromptFilename, signal) {
        console.log('createChatCompletion', this.assistantId);
        const contentLength = content.length;
        await this.loadSystemPrompt(systemPromptFilename);
        if (this.systemPrompt) {
            await this.updateAssistantPrompt(this.assistantId, this.systemPrompt);
        }
        const { threads } = this.client.beta;
        console.log('Creating thread');
        const thread = await threads.create({ signal });
        await threads.messages.create(thread.id, {
            role: 'user',
            content,
        }, { signal });
        const run = await threads.runs.createAndPoll(thread.id, {
            assistant_id: this.assistantId,
        }, { signal });
        if (run.last_error) {
            return {
                error: `${run.last_error.code}: ${run.last_error.message}`,
            };
        }
        if (run.status === 'completed') {
            const messagesResponse = await threads.messages.list(thread.id, { signal });
            const textBlock = messagesResponse.data[0].content[0];
            try {
                const text = textBlock.text.value.trim();
                return { result: text };
            }
            catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return { error: 'Request aborted' };
                }
                console.error('Error parsing JSON', textBlock.text.value);
                return {
                    error: 'Error parsing JSON',
                };
            }
        }
        else {
            console.log('Run is not completed', run.status);
            return {
                error: 'Run is not completed',
            };
        }
    }
    async updateAssistantPrompt(assistantId, newPrompt) {
        try {
            await this.client.beta.assistants.update(assistantId, {
                instructions: newPrompt,
            });
            console.log(`Assistant ${assistantId} prompt updated successfully`);
        }
        catch (error) {
            console.error(`Error updating assistant ${assistantId} prompt:`, error.message);
            throw error;
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
    async getEmbeddings(text) {
        try {
            const response = await this.client.embeddings.create({
                model: consts_1.OPENAI_EMBEDDING_MODEL,
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('Error getting embeddings:', error);
            throw error;
        }
    }
}
exports.OpenAIConnector = OpenAIConnector;
