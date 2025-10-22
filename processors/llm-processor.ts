import { jsonrepair } from 'jsonrepair';
import { saveJsonToFileAsync } from '../utils/file-utils';
import { ELLMProvider, LAST_LLM_RESULT_RAW_FILENAME } from '../consts';
import { ISimpleLLMConnector, ISplitPrompt, IEnvOptions } from '../interfaces';
import { AnthropicConnector } from '../llm-connectors/anthropic.connector';
import { DeepSeekConnector } from '../llm-connectors/deepseek.connector';
import { OpenAIConnector } from '../llm-connectors/openai.connector';
import { withTimeout } from '../utils/promise-utils';
import { getEnvConfig } from '../utils/env-utils';

export class LLMProcessor {
  private connectors: Partial<Record<ELLMProvider, ISimpleLLMConnector>>;
  private envConfig: Required<IEnvOptions>;
  private lastWorkingProvider: ELLMProvider;

  constructor(envConfig?: Required<IEnvOptions>) {
    // If envConfig is provided, use it; otherwise create from process.env
    this.envConfig = envConfig || getEnvConfig();
    this.lastWorkingProvider = this.envConfig.LLM_PROVIDER;
    
    this.connectors = {
      [ELLMProvider.Anthropic]: new AnthropicConnector(this.envConfig),
      [ELLMProvider.OpenAI]: new OpenAIConnector(this.envConfig.OPENAI_ASSISTANT_VALVE_ID, this.envConfig),
      [ELLMProvider.DeepSeek]: new DeepSeekConnector(this.envConfig),
    }
  }

  async sendMessage(
    text: string | ISplitPrompt, 
    provider?: ELLMProvider, 
    model?: string,
    signal?: AbortSignal
  ): Promise<{
    result: string;
    metadata: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    const actualProvider = provider || this.envConfig.FAST_REQUEST_LLM_PROVIDER;
    try {
      const connector = this.connectors[actualProvider];
      if (!connector) {
        throw new Error(`Unsupported provider: ${actualProvider}`);
      }

      const response = await connector.sendChatMessage(text, model, signal);
      return {
        result: response.result || '',
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
    const actualStartingProvider = startingProvider || this.envConfig.LLM_PROVIDER;
    const providersToTry = [actualStartingProvider];
    
    const substituteMap = {
      [ELLMProvider.OpenAI]: [this.envConfig.LLM_CONNECTORS_SUBSTITUTE_OPENAI],
      [ELLMProvider.Anthropic]: [this.envConfig.LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC],
      [ELLMProvider.DeepSeek]: [this.envConfig.LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK],
    };
    const substitutes = substituteMap[actualStartingProvider as keyof typeof substituteMap] || [];
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
      } else {
        console.warn(`Provider ${currentProvider} failed:`, error?.message);
      }
    }
    throw new Error(`No response from any provider`);
  }
  
  private async tryLLMProviderSendMessage(
    provider: ELLMProvider, 
    message: string | ISplitPrompt, 
    allowString: boolean = false,
    signal?: AbortSignal
  ): Promise<[any, Error | null]> {
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
      
      if (!this.connectors[provider]) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const sendPromise = this.sendMessage(cleanedMessage, provider, undefined, signal);
      const response = await withTimeout(
        sendPromise,
        this.envConfig.LLM_RESULT_TIMEOUT_MS,
        `LLM ${provider} request timeout`
      );

      if (!response.result) {
        throw new Error('Empty response from LLM');
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
        }, null];
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        return [null, parseError as Error];
      }
    } catch (error) {
      console.log(`${new Date().toUTCString()} | Error when getting response from ${provider}:`, error);
      return [null, error as Error];
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