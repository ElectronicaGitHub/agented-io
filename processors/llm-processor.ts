import { jsonrepair } from 'jsonrepair';
import { saveJsonToFileAsync } from '../utils/file-utils';
import { ELLMProvider, LAST_LLM_RESULT_RAW_FILENAME } from '../consts';
import { ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';
import { AnthropicConnector } from '../llm-connectors/anthropic.connector';
import { DeepSeekConnector } from '../llm-connectors/deepseek.connector';
import { GrokConnector } from '../llm-connectors/grok.connector';
import { OpenAIConnector } from '../llm-connectors/openai.connector';
import { withTimeout } from '../utils/promise-utils';
import { getEnvConfig } from '../utils/env-utils';

export class LLMProcessor {
  private connectors: Partial<Record<ELLMProvider, ISimpleLLMConnector>>;
  private getEnvConfigFn: () => Required<IEnvOptions>;
  private lastWorkingProvider: ELLMProvider;
  private onStatusError?: (data: { status: number; provider: ELLMProvider; error?: string; timestamp: Date }) => void;

  constructor(
    getEnvConfigFn?: () => Required<IEnvOptions>, 
    onStatusError?: (data: { status: number; provider: ELLMProvider; error?: string; timestamp: Date }) => void
  ) {
    // If getEnvConfigFn is provided, use it; otherwise create a function that reads from process.env
    this.getEnvConfigFn = getEnvConfigFn || (() => getEnvConfig());
    this.lastWorkingProvider = this.getEnvConfigFn().LLM_PROVIDER;
    this.onStatusError = onStatusError;
    
    this.connectors = {
      [ELLMProvider.Anthropic]: new AnthropicConnector(() => this.getEnvConfigFn()),
      [ELLMProvider.OpenAI]: new OpenAIConnector(() => this.getEnvConfigFn()),
      [ELLMProvider.DeepSeek]: new DeepSeekConnector(() => this.getEnvConfigFn()),
      [ELLMProvider.Grok]: new GrokConnector(() => this.getEnvConfigFn()),
    }
  }

  async sendMessage(
    text: string | ISplitPrompt, 
    provider?: ELLMProvider, 
    model?: string,
    signal?: AbortSignal
  ): Promise<{
    result: string;
    httpStatus?: number;
    metadata: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    const actualProvider = provider || this.getEnvConfigFn().FAST_REQUEST_LLM_PROVIDER;
    try {
      const connector = this.connectors[actualProvider];
      if (!connector) {
        throw new Error(`Unsupported provider: ${actualProvider}`);
      }

      const response = await connector.sendChatMessage(text, model, signal);
      
      // Check if we need to call callback for this HTTP status
      if (response.httpStatus && this.getEnvConfigFn().statusesForEventRaise.includes(response.httpStatus)) {
        this.onStatusError?.({
          status: response.httpStatus,
          provider: actualProvider,
          error: response.error,
          timestamp: new Date()
        });
      }
      
      return {
        result: response.result || '',
        httpStatus: response.httpStatus,
        metadata: {
          inputTokens: typeof text === 'string' ? text.length : text.cacheable.length,
          outputTokens: response.result?.length || 0
        }
      };
    } catch (error) {
      console.log(`[LLMProcessor.sendMessage] Error when sending message to ${actualProvider}:`, error);
      throw error; // Propagate the error to be handled by the caller
    }
  }

  async getLLMResultSendMessage(message: string | ISplitPrompt, allowString: boolean = false, signal?: AbortSignal): Promise<{
    result: any;
    metadata: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    try {
      const result = await this.tryMultipleProvidersSendMessage(message, this.lastWorkingProvider, allowString, signal);
      return result;
    } catch (error) {
      console.error('Failed to get LLM result from all providers:', error);
      throw error; // Let the caller handle the final failure
    }
  }

  private async tryMultipleProvidersSendMessage(
    message: string | ISplitPrompt, 
    startingProvider?: ELLMProvider,
    allowString: boolean = false,
    signal?: AbortSignal
  ): Promise<{
    result: string;
    metadata: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    const envConfig = this.getEnvConfigFn();
    const actualStartingProvider = startingProvider || envConfig.LLM_PROVIDER;
    const providersToTry = [actualStartingProvider];
    
    const substituteMap = {
      [ELLMProvider.OpenAI]: [envConfig.LLM_CONNECTORS_SUBSTITUTE_OPENAI],
      [ELLMProvider.Anthropic]: [envConfig.LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC],
      [ELLMProvider.DeepSeek]: [envConfig.LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK],
      [ELLMProvider.Grok]: [envConfig.LLM_CONNECTORS_SUBSTITUTE_GROK],
    };
    const substitutes = substituteMap[actualStartingProvider as keyof typeof substituteMap] || [];
    for (const provider of substitutes) {
      if (!providersToTry.includes(provider)) {
        providersToTry.push(provider);
      }
    }

    for (const currentProvider of providersToTry) {
      const [result, error, shouldStopRetry] = await this.tryLLMProviderSendMessage(currentProvider, message, allowString, signal);
      if (!error && result) {
        this.lastWorkingProvider = currentProvider;
        return result;
      } else {
        console.warn(`[LLMProcessor] Provider ${currentProvider} failed:`, error?.message);
        // If we should stop retry (e.g., status in statusesForEventRaise), throw immediately
        if (shouldStopRetry) {
          console.log(`[LLMProcessor] Stopping retry due to status event from ${currentProvider}`);
          throw error ? { 
            message: error.message, 
            shouldStopRetry: true
          } : new Error('Request stopped due to status event');
        }
      }
    }
    throw new Error(`No response from any provider`);
  }
  
  private async tryLLMProviderSendMessage(
    provider: ELLMProvider, 
    message: string | ISplitPrompt, 
    allowString: boolean = false,
    signal?: AbortSignal
  ): Promise<[any, Error | null, boolean]> {
    try {
      let originalLength: number;
      let cleanedMessage: string | ISplitPrompt;
      if (typeof message === 'string') {
        originalLength = message.length;
        cleanedMessage = this.#cleanMessage(message);
      } else {
        originalLength = message.cacheable.length;
        cleanedMessage = {
          cacheable: this.#cleanMessage(message.cacheable),
          nonCacheable: this.#cleanMessage(message.nonCacheable),
        };
      }
      const cleanedLength = typeof cleanedMessage === 'string' ? cleanedMessage.length : cleanedMessage.cacheable.length;
      
      console.log(`[LLMProcessor.tryLLMProviderSendMessage] Sending request to ${provider} with message length: ${cleanedLength} (was ${originalLength}, removed ${originalLength - cleanedLength} characters)`);
      
      // Log prompt if enabled
      const envConfig = this.getEnvConfigFn();
      if (envConfig.LOG_PROMPT) {
        console.log('\n=== LLM PROMPT START ===');
        if (typeof cleanedMessage === 'string') {
          console.log(cleanedMessage);
        } else {
          console.log('--- Cacheable part ---');
          console.log(cleanedMessage.cacheable);
          console.log('--- Non-cacheable part ---');
          console.log(cleanedMessage.nonCacheable);
        }
        console.log('=== LLM PROMPT END ===\n');
      }
      
      if (!this.connectors[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const sendPromise = this.sendMessage(cleanedMessage, provider, undefined, signal);
      const response = await withTimeout(
        sendPromise,
        envConfig.LLM_RESULT_TIMEOUT_MS,
        `LLM ${provider} request timeout`
      );

      // Check if we should stop retry due to status event
      const shouldStopRetry = response.httpStatus && envConfig.statusesForEventRaise.includes(response.httpStatus);

      if (shouldStopRetry) {
        return [null, new Error(`LLM ${provider} request failed with status ${response.httpStatus}`), true];
      }

      if (!response.result) {
        console.log('Empty response from LLM');
        return [null, new Error('Empty response from LLM'), shouldStopRetry || false];
      }
      
      // Log response if enabled
      if (envConfig.LOG_RESPONSE) {
        console.log('\n=== LLM RESPONSE START ===');
        console.log(response.result);
        console.log('=== LLM RESPONSE END ===\n');
      }
      
      // Otherwise try to parse it as JSON
      try {
        await saveJsonToFileAsync(LAST_LLM_RESULT_RAW_FILENAME, response.result);
        const parsedResponse = this.#parseJsonResponse(response.result, allowString);
        if (!parsedResponse) {
          throw new Error('Failed to parse JSON response');
        }
        return [{
          result: parsedResponse,
          metadata: response.metadata
        }, null, false];
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        return [null, parseError as Error, shouldStopRetry || false];
      }
    } catch (error: any) {
      console.log(`${new Date().toUTCString()} | Error when getting response from ${provider}:`, error);
      // Check if error has httpStatus that should stop retry
      const envConfig = this.getEnvConfigFn();
      const shouldStopRetry = error?.httpStatus && envConfig.statusesForEventRaise.includes(error.httpStatus);
      return [null, error as Error, shouldStopRetry || false];
    }
  }

  #cleanMessage(message: string): string {
    return message
      .replace(/\n/g, ' ') // Заменяем переносы строк на пробелы
      .replace(/\r/g, '') // Удаляем возврат каретки
      .replace(/\t/g, ' ') // Заменяем табуляцию на пробелы
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .trim(); // Удаляем пробелы в начале и конце
  }

  #parseAndRepairJson(result: string): any | null {
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const match = result.match(codeBlockRegex);
    if (match) {
      try {
        const jsonContent = match[1].trim();
        return JSON.parse(jsonrepair(jsonContent));
      } catch (e) {
        console.log('Failed to parse JSON from code block in string:', match[1]);
      }
    }
  }

  #parseStringResponse(result: string): any | null {
    return result;
  }

  #parseJsonResponse(result: string, allowString: boolean = false): any | null {
    // console.log(`[LLMProcessor.parseJsonResponse] result: ${result}, allowString: ${allowString}`);
    if (allowString) {
      return this.#parseStringResponse(result);
    }
    try {
      // First try to parse the entire string as JSON
      const parsed = JSON.parse(result);
      // If the result is a string containing a code block, parse that
      if (typeof parsed === 'string') {
        return this.#parseAndRepairJson(parsed);
      }
      return parsed;
    } catch (e) {
      // If direct parsing fails, try to extract JSON from markdown code blocks
      const parsed = this.#parseAndRepairJson(result);
      if (parsed) {
        return parsed;
      }

      // If that fails, try to extract JSON using regex
      const jsonRegex = /(\[[\s\S]*\]|\{[\s\S]*\})/;
      const extractedJson = result.match(jsonRegex);
      if (extractedJson) {
        try {
          return JSON.parse(jsonrepair(extractedJson[0].trim()));
        } catch (e) {
          console.log('Failed to parse extracted JSON:', extractedJson[0]);
        }
      }
      console.log('Failed to parse JSON response:', result);
      return null;
    }
  }
}