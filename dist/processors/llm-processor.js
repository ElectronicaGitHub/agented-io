"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LLMProcessor_instances, _LLMProcessor_cleanMessage, _LLMProcessor_parseAndRepairJson, _LLMProcessor_parseStringResponse, _LLMProcessor_parseJsonResponse;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMProcessor = void 0;
const jsonrepair_1 = require("jsonrepair");
const file_utils_1 = require("../utils/file-utils");
const consts_1 = require("../consts");
const anthropic_connector_1 = require("../llm-connectors/anthropic.connector");
const deepseek_connector_1 = require("../llm-connectors/deepseek.connector");
const openai_connector_1 = require("../llm-connectors/openai.connector");
const promise_utils_1 = require("../utils/promise-utils");
class LLMProcessor {
    constructor() {
        _LLMProcessor_instances.add(this);
        this.lastWorkingProvider = consts_1.LLM_PROVIDER;
        this.connectors = {
            [consts_1.ELLMProvider.Anthropic]: new anthropic_connector_1.AnthropicConnector(),
            [consts_1.ELLMProvider.OpenAI]: new openai_connector_1.OpenAIConnector(consts_1.OPENAI_ASSISTANT_VALVE_ID),
            [consts_1.ELLMProvider.DeepSeek]: new deepseek_connector_1.DeepSeekConnector(),
        };
    }
    async sendMessage(text, provider = consts_1.FAST_REQUEST_LLM_PROVIDER, model, signal) {
        try {
            const connector = this.connectors[provider];
            if (!connector) {
                throw new Error(`Unsupported provider: ${provider}`);
            }
            const response = await connector.sendChatMessage(text, model, signal);
            return {
                result: response.result || '',
                metadata: {
                    inputTokens: typeof text === 'string' ? text.length : text.cacheable.length,
                    outputTokens: response.result?.length || 0
                }
            };
        }
        catch (error) {
            console.log(`[LLMProcessor.sendMessage] Error when sending message to ${provider}:`, error);
            throw error; // Propagate the error to be handled by the caller
        }
    }
    async getLLMResultSendMessage(message, allowString = false) {
        try {
            const result = await this.tryMultipleProvidersSendMessage(message, this.lastWorkingProvider, allowString);
            return result;
        }
        catch (error) {
            console.error('Failed to get LLM result from all providers:', error);
            throw error; // Let the caller handle the final failure
        }
    }
    async tryMultipleProvidersSendMessage(message, startingProvider = consts_1.LLM_PROVIDER, allowString = false, signal) {
        const providersToTry = [startingProvider];
        const substitutes = consts_1.LLM_CONNECTORS_SUBSTITUTE[startingProvider] || [];
        for (const provider of substitutes) {
            if (!providersToTry.includes(provider)) {
                providersToTry.push(provider);
            }
        }
        for (const currentProvider of providersToTry) {
            const [result, error] = await this.tryLLMProviderSendMessage(currentProvider, message, allowString, signal);
            if (!error && result) {
                this.lastWorkingProvider = currentProvider;
                return result;
            }
            else {
                console.warn(`Provider ${currentProvider} failed:`, error?.message);
            }
        }
        throw new Error(`No response from any provider`);
    }
    async tryLLMProviderSendMessage(provider, message, allowString = false, signal) {
        try {
            let originalLength;
            let cleanedMessage;
            if (typeof message === 'string') {
                originalLength = message.length;
                cleanedMessage = __classPrivateFieldGet(this, _LLMProcessor_instances, "m", _LLMProcessor_cleanMessage).call(this, message);
            }
            else {
                originalLength = message.cacheable.length;
                cleanedMessage = {
                    cacheable: __classPrivateFieldGet(this, _LLMProcessor_instances, "m", _LLMProcessor_cleanMessage).call(this, message.cacheable),
                    nonCacheable: __classPrivateFieldGet(this, _LLMProcessor_instances, "m", _LLMProcessor_cleanMessage).call(this, message.nonCacheable),
                };
            }
            const cleanedLength = typeof cleanedMessage === 'string' ? cleanedMessage.length : cleanedMessage.cacheable.length;
            console.log(`[LLMProcessor.tryLLMProviderSendMessage] Sending request to ${provider} with message length: ${cleanedLength} (was ${originalLength}, removed ${originalLength - cleanedLength} characters)`);
            if (!this.connectors[provider]) {
                throw new Error(`Unsupported provider: ${provider}`);
            }
            const sendPromise = this.sendMessage(cleanedMessage, provider, undefined, signal);
            const response = await (0, promise_utils_1.withTimeout)(sendPromise, consts_1.LLM_RESULT_TIMEOUT_MS, `LLM ${provider} request timeout`);
            if (!response.result) {
                throw new Error('Empty response from LLM');
            }
            // Otherwise try to parse it as JSON
            try {
                await (0, file_utils_1.saveJsonToFileAsync)(consts_1.LAST_LLM_RESULT_RAW_FILENAME, response.result);
                const parsedResponse = __classPrivateFieldGet(this, _LLMProcessor_instances, "m", _LLMProcessor_parseJsonResponse).call(this, response.result, allowString);
                if (!parsedResponse) {
                    throw new Error('Failed to parse JSON response');
                }
                return [{
                        result: parsedResponse,
                        metadata: response.metadata
                    }, null];
            }
            catch (parseError) {
                console.error('Error parsing JSON response:', parseError);
                return [null, parseError];
            }
        }
        catch (error) {
            console.log(`${new Date().toUTCString()} | Error when getting response from ${provider}:`, error);
            return [null, error];
        }
    }
}
exports.LLMProcessor = LLMProcessor;
_LLMProcessor_instances = new WeakSet(), _LLMProcessor_cleanMessage = function _LLMProcessor_cleanMessage(message) {
    return message
        .replace(/\n/g, ' ') // Заменяем переносы строк на пробелы
        .replace(/\r/g, '') // Удаляем возврат каретки
        .replace(/\t/g, ' ') // Заменяем табуляцию на пробелы
        .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
        .trim(); // Удаляем пробелы в начале и конце
}, _LLMProcessor_parseAndRepairJson = function _LLMProcessor_parseAndRepairJson(result) {
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const match = result.match(codeBlockRegex);
    if (match) {
        try {
            const jsonContent = match[1].trim();
            return JSON.parse((0, jsonrepair_1.jsonrepair)(jsonContent));
        }
        catch (e) {
            console.log('Failed to parse JSON from code block in string:', match[1]);
        }
    }
}, _LLMProcessor_parseStringResponse = function _LLMProcessor_parseStringResponse(result) {
    return result;
}, _LLMProcessor_parseJsonResponse = function _LLMProcessor_parseJsonResponse(result, allowString = false) {
    // console.log(`[LLMProcessor.parseJsonResponse] result: ${result}, allowString: ${allowString}`);
    if (allowString) {
        return __classPrivateFieldGet(this, _LLMProcessor_instances, "m", _LLMProcessor_parseStringResponse).call(this, result);
    }
    try {
        // First try to parse the entire string as JSON
        const parsed = JSON.parse(result);
        // If the result is a string containing a code block, parse that
        if (typeof parsed === 'string') {
            return __classPrivateFieldGet(this, _LLMProcessor_instances, "m", _LLMProcessor_parseAndRepairJson).call(this, parsed);
        }
        return parsed;
    }
    catch (e) {
        // If direct parsing fails, try to extract JSON from markdown code blocks
        const parsed = __classPrivateFieldGet(this, _LLMProcessor_instances, "m", _LLMProcessor_parseAndRepairJson).call(this, result);
        if (parsed) {
            return parsed;
        }
        // If that fails, try to extract JSON using regex
        const jsonRegex = /(\[[\s\S]*\]|\{[\s\S]*\})/;
        const extractedJson = result.match(jsonRegex);
        if (extractedJson) {
            try {
                return JSON.parse((0, jsonrepair_1.jsonrepair)(extractedJson[0].trim()));
            }
            catch (e) {
                console.log('Failed to parse extracted JSON:', extractedJson[0]);
            }
        }
        console.log('Failed to parse JSON response:', result);
        return null;
    }
};
