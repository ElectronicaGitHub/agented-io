
import { Agent } from '../agent';
import { EAgentType, EAgentResponseType } from '../enums';
import { IAgentSchema, IAgentResponse, IAgentActionFunction } from '../interfaces';

// Mock all external dependencies
jest.mock('../processors/llm-processor');
jest.mock('../main-agent');
jest.mock('../utils/agent-factory');

describe('Agent Integration - Unified Actions', () => {
  let agent: Agent;
  let mockAgentSchema: IAgentSchema;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a minimal agent schema
    mockAgentSchema = {
      id: 'test-schema-id',
      name: 'test-agent',
      type: EAgentType.PERMANENT,
      prompt: 'Test prompt',
      functions: [],
      children: [],
    };

    // Create agent instance
    agent = new Agent('test-id', mockAgentSchema);
  });

  afterEach(() => {
    // Cleanup any remaining timeouts/intervals
    if (agent) {
      (agent as any).cleanup?.();
    }
    jest.clearAllTimers();
  });

  describe('Multiple functions execution via handleFunctionActions', () => {
    it('should handle multiple function actions correctly', async () => {
      const functionActions: IAgentActionFunction[] = [
        {
          type: EAgentResponseType.FUNCTION,
          functionName: 'function1',
          paramsToPass: { param1: 'value1' },
        },
        {
          type: EAgentResponseType.FUNCTION,
          functionName: 'function2',
          paramsToPass: { param2: 'value2' },
        },
      ];

      // Mock the executeSingleFunction method
      const mockExecuteSingleFunction = jest.spyOn(agent as any, 'executeSingleFunction');
      mockExecuteSingleFunction.mockResolvedValue('function result');

      const result = await (agent as any).handleFunctionActions(functionActions);

      expect(mockExecuteSingleFunction).toHaveBeenCalledTimes(2);
      expect(result).toContain('function result');
    });

    it('should handle timeout in function actions execution', async () => {
      const functionActions: IAgentActionFunction[] = [
        {
          type: EAgentResponseType.FUNCTION,
          functionName: 'slow_function',
          paramsToPass: {},
        },
      ];

      // Mock the executeSingleFunction method to be slow
      const mockExecuteSingleFunction = jest.spyOn(agent as any, 'executeSingleFunction');
      mockExecuteSingleFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 15000))
      );

      const result = await (agent as any).handleFunctionActions(functionActions);

      expect(result).toContain('Functions timed out');
    }, 15000);

    it('should handle errors in function actions execution', async () => {
      const functionActions: IAgentActionFunction[] = [
        {
          type: EAgentResponseType.FUNCTION,
          functionName: 'error_function',
          paramsToPass: {},
        },
      ];

      // Mock the executeSingleFunction method to throw error
      const mockExecuteSingleFunction = jest.spyOn(agent as any, 'executeSingleFunction');
      mockExecuteSingleFunction.mockRejectedValue(new Error('Function error'));

      const result = await (agent as any).handleFunctionActions(functionActions);

      expect(result).toContain('Error executing function error_function: Function error');
    });
  });

  describe('Response building', () => {
    it('should build response event for multiple function actions correctly', () => {
      const response: IAgentResponse = {
        actions: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function1',
            paramsToPass: {},
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function2',
            paramsToPass: {},
          },
        ],
        finished: false,
      };

      const functionResults = 'multiple functions result';
      const event = (agent as any).buildResponseEvent(response, functionResults);

      expect(event.type).toBe(EAgentResponseType.FUNCTION);
      expect(event.functionName).toBe('function1, function2');
      expect(event.text).toBe('multiple functions result');
      expect(event.sender).toBe('test-agent');
    });

    it('should build response event for text actions correctly', () => {
      const response: IAgentResponse = {
        actions: [
          { type: EAgentResponseType.TEXT, text: 'Hello' },
        ],
        finished: true,
      };

      const event = (agent as any).buildResponseEvent(response, undefined, undefined, 'Hello');

      expect(event.type).toBe(EAgentResponseType.TEXT);
      expect(event.text).toBe('Hello');
      expect(event.sender).toBe('test-agent');
    });
  });

  describe('Unified actions response format', () => {
    it('should accept unified response with multiple function actions', () => {
      const response: IAgentResponse = {
        actions: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function1',
            paramsToPass: { param1: 'value1' },
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function2',
            paramsToPass: { param2: 'value2' },
          },
        ],
        finished: false,
      };

      expect(response.actions).toHaveLength(2);
      expect(response.actions[0].type).toBe(EAgentResponseType.FUNCTION);
      expect(response.actions[1].type).toBe(EAgentResponseType.FUNCTION);
      expect(response.finished).toBe(false);
    });

    it('should accept mixed text and function actions', () => {
      const response: IAgentResponse = {
        actions: [
          { type: EAgentResponseType.TEXT, text: 'Working...' },
          { type: EAgentResponseType.FUNCTION, functionName: 'fn1', paramsToPass: {} },
        ],
        finished: false,
        explanation: 'Processing request',
      };

      expect(response.actions).toHaveLength(2);
      expect(response.actions[0].type).toBe(EAgentResponseType.TEXT);
      expect(response.actions[1].type).toBe(EAgentResponseType.FUNCTION);
    });
  });

  describe('Real LLM integration with multiple functions', () => {
    it('should handle LLM response with multiple function actions', async () => {
      const testAgentSchema: IAgentSchema = {
        id: 'test-llm-schema-id',
        name: 'test-llm-agent',
        type: EAgentType.PERMANENT,
        prompt: 'You are a test agent.',
        functions: [
          {
            name: 'get_weather_data',
            description: 'Get weather data for a location',
            func: async (params: any) => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return `Weather data for ${params.location}: sunny, 25°C`;
            },
            paramsToPass: { location: 'string' }
          },
          {
            name: 'get_stock_price',
            description: 'Get stock price for a symbol',
            func: async (params: any) => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return `Stock price for ${params.symbol}: $150.25`;
            },
            paramsToPass: { symbol: 'string' }
          },
          {
            name: 'get_news_headlines',
            description: 'Get latest news headlines',
            func: async (params: any) => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return `Latest news: ${params.topic} - Breaking developments`;
            },
            paramsToPass: { topic: 'string' }
          }
        ],
        children: [],
      };

      const testAgent = new Agent('test-llm-id', testAgentSchema);
      await testAgent.init();

      // Mock LLM to return unified actions response
      const mockLLMProcessor = testAgent['llmProcessor'];
      mockLLMProcessor.getLLMResultSendMessage = jest.fn().mockResolvedValue({
        result: {
          actions: [
            {
              type: EAgentResponseType.FUNCTION,
              functionName: 'get_weather_data',
              paramsToPass: { location: 'New York' },
            },
            {
              type: EAgentResponseType.FUNCTION,
              functionName: 'get_stock_price',
              paramsToPass: { symbol: 'AAPL' },
            },
            {
              type: EAgentResponseType.FUNCTION,
              functionName: 'get_news_headlines',
              paramsToPass: { topic: 'technology' },
            }
          ],
          finished: false,
        },
        metadata: { inputTokens: 10, outputTokens: 5, cachedTokens: 0, nonCachedTokens: 10, modelUsed: 'test' }
      });

      const startTime = Date.now();
      testAgent.process('Get me weather data for New York, stock price for AAPL, and latest tech news', 'user');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(mockLLMProcessor.getLLMResultSendMessage).toHaveBeenCalled();
      expect(executionTime).toBeLessThan(4000);
      
      (testAgent as any).cleanup?.();
    }, 10000);

    it('should execute multiple functions in parallel and measure performance', async () => {
      const testAgentSchema: IAgentSchema = {
        id: 'test-parallel-schema-id',
        name: 'test-parallel-agent',
        type: EAgentType.PERMANENT,
        prompt: 'Test agent for parallel function execution',
        functions: [
          {
            name: 'fast_function',
            description: 'Fast function that returns quickly',
            func: async () => {
              await new Promise(resolve => setTimeout(resolve, 100));
              return 'Fast function completed';
            },
            paramsToPass: {}
          },
          {
            name: 'medium_function',
            description: 'Medium function that takes some time',
            func: async () => {
              await new Promise(resolve => setTimeout(resolve, 500));
              return 'Medium function completed';
            },
            paramsToPass: {}
          },
          {
            name: 'slow_function',
            description: 'Slow function that takes longer',
            func: async () => {
              await new Promise(resolve => setTimeout(resolve, 1000));
              return 'Slow function completed';
            },
            paramsToPass: {}
          }
        ],
        children: [],
      };

      const testAgent = new Agent('test-parallel-id', testAgentSchema);
      await testAgent.init();

      // Mock LLM to return unified actions response with all three functions
      const mockLLMProcessor = testAgent['llmProcessor'];
      mockLLMProcessor.getLLMResultSendMessage = jest.fn().mockResolvedValue({
        result: {
          actions: [
            { type: EAgentResponseType.FUNCTION, functionName: 'fast_function', paramsToPass: {} },
            { type: EAgentResponseType.FUNCTION, functionName: 'medium_function', paramsToPass: {} },
            { type: EAgentResponseType.FUNCTION, functionName: 'slow_function', paramsToPass: {} },
          ],
          finished: false,
        },
        metadata: { inputTokens: 10, outputTokens: 5, cachedTokens: 0, nonCachedTokens: 10, modelUsed: 'test' }
      });

      const startTime = Date.now();
      testAgent.process('Execute all functions', 'user');
      
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`Execution time: ${executionTime}ms (expected: 900-3000ms for parallel execution)`);

      expect(executionTime).toBeLessThan(3000);
      expect(executionTime).toBeGreaterThan(900);

      (testAgent as any).cleanup?.();
    }, 5000);
  });
});
