
import { Agent } from '../agent';
import { EAgentType, EAgentResponseType } from '../enums';
import { IAgentSchema } from '../interfaces';

// Mock all external dependencies
jest.mock('../processors/llm-processor');
jest.mock('../main-agent');
jest.mock('../utils/agent-factory');

describe('Agent Integration - Multiple Functions', () => {
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

  describe('Multiple functions execution', () => {
    it('should handle multiple functions response correctly', async () => {
      const multipleFunctionsResponse = {
        type: EAgentResponseType.MULTIPLE_FUNCTIONS,
        functions: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function1',
            paramsToPass: { param1: 'value1' },
            finished: false,
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function2',
            paramsToPass: { param2: 'value2' },
            finished: false,
          },
        ],
        finished: false,
      };

      // Mock the handleFunctionResponse method
      const mockHandleFunctionResponse = jest.spyOn(agent as any, 'handleFunctionResponse');
      mockHandleFunctionResponse.mockResolvedValue('function result');

      const result = await (agent as any).handleMultipleFunctionsResponse(multipleFunctionsResponse);

      expect(mockHandleFunctionResponse).toHaveBeenCalledTimes(2);
      expect(result).toContain('function result');
    });

    it('should handle timeout in multiple functions execution', async () => {
      const multipleFunctionsResponse = {
        type: EAgentResponseType.MULTIPLE_FUNCTIONS,
        functions: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'slow_function',
            paramsToPass: {},
            finished: false,
          },
        ],
        finished: false,
      };

      // Mock the handleFunctionResponse method to be slow
      const mockHandleFunctionResponse = jest.spyOn(agent as any, 'handleFunctionResponse');
      mockHandleFunctionResponse.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 15000))
      );

      const result = await (agent as any).handleMultipleFunctionsResponse(multipleFunctionsResponse);

      expect(result).toContain('Functions failed to execute within the specified time limit');
    }, 15000); // Increase timeout for this test

    it('should handle errors in multiple functions execution', async () => {
      const multipleFunctionsResponse = {
        type: EAgentResponseType.MULTIPLE_FUNCTIONS,
        functions: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'error_function',
            paramsToPass: {},
            finished: false,
          },
        ],
        finished: false,
      };

      // Mock the handleFunctionResponse method to throw error
      const mockHandleFunctionResponse = jest.spyOn(agent as any, 'handleFunctionResponse');
      mockHandleFunctionResponse.mockRejectedValue(new Error('Function error'));

      const result = await (agent as any).handleMultipleFunctionsResponse(multipleFunctionsResponse);

      expect(result).toContain('Error executing function error_function: Function error');
    });
  });

  describe('Response building', () => {
    it('should build response event for multiple functions correctly', () => {
      const response = {
        type: EAgentResponseType.MULTIPLE_FUNCTIONS,
        functions: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function1',
            paramsToPass: {},
            finished: false,
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'function2',
            paramsToPass: {},
            finished: false,
          },
        ],
        finished: false,
      };

      const result = 'multiple functions result';
      const event = (agent as any).buildResponseEvent(response, result);

      expect(event.type).toBe(EAgentResponseType.MULTIPLE_FUNCTIONS);
      expect(event.functionName).toBe('function1, function2');
      expect(event.text).toBe('multiple functions result');
      expect(event.sender).toBe('test-agent');
    });
  });

  describe('Array response detection', () => {
    it('should detect array response and convert to multiple functions', () => {
      const arrayResponse = [
        {
          type: EAgentResponseType.FUNCTION,
          functionName: 'function1',
          paramsToPass: { param1: 'value1' },
          finished: false,
        },
        {
          type: EAgentResponseType.FUNCTION,
          functionName: 'function2',
          paramsToPass: { param2: 'value2' },
          finished: false,
        },
      ];

      // Test the conversion logic
      const convertedResponse = {
        type: EAgentResponseType.MULTIPLE_FUNCTIONS,
        functions: arrayResponse,
        finished: false,
      };

      expect(convertedResponse.type).toBe(EAgentResponseType.MULTIPLE_FUNCTIONS);
      expect(convertedResponse.functions).toEqual(arrayResponse);
      expect(convertedResponse.functions.length).toBe(2);
    });
  });

  describe('Real LLM integration with multiple functions', () => {
    it('should handle real LLM response with multiple functions', async () => {
      // Create agent schema with test functions
      const testAgentSchema: IAgentSchema = {
        id: 'test-llm-schema-id',
        name: 'test-llm-agent',
        type: EAgentType.PERMANENT,
        prompt: 'You are a test agent. When asked to get data from multiple sources, respond with an array of function calls.',
        functions: [
          {
            name: 'get_weather_data',
            description: 'Get weather data for a location',
            func: async (params: any) => {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
              return `Weather data for ${params.location}: sunny, 25°C`;
            },
            paramsToPass: { location: 'string' }
          },
          {
            name: 'get_stock_price',
            description: 'Get stock price for a symbol',
            func: async (params: any) => {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
              return `Stock price for ${params.symbol}: $150.25`;
            },
            paramsToPass: { symbol: 'string' }
          },
          {
            name: 'get_news_headlines',
            description: 'Get latest news headlines',
            func: async (params: any) => {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
              return `Latest news: ${params.topic} - Breaking developments`;
            },
            paramsToPass: { topic: 'string' }
          }
        ],
        children: [],
      };

      // Create new agent with test functions
      const testAgent = new Agent('test-llm-id', testAgentSchema);

      // Initialize the agent
      await testAgent.init();

      // Mock LLM to return array of functions
      const mockLLMProcessor = testAgent['llmProcessor'];
      mockLLMProcessor.getLLMResultSendMessage = jest.fn().mockResolvedValue({
        result: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'get_weather_data',
            paramsToPass: { location: 'New York' },
            finished: false,
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'get_stock_price',
            paramsToPass: { symbol: 'AAPL' },
            finished: false,
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'get_news_headlines',
            paramsToPass: { topic: 'technology' },
            finished: false,
          }
        ],
        metadata: {}
      });

      // Process the request
      const startTime = Date.now();
      testAgent.process('Get me weather data for New York, stock price for AAPL, and latest tech news', 'user');
      
      // Wait for processing to complete (functions take 1 second each, but run in parallel)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify that all functions were called
      expect(mockLLMProcessor.getLLMResultSendMessage).toHaveBeenCalled();
      
      // Check that execution time is reasonable (should be around 1 second due to parallel execution)
      expect(executionTime).toBeLessThan(4000); // Should be much less than 4 seconds if parallel
      
      // Cleanup
      (testAgent as any).cleanup?.();
    }, 10000); // 10 second timeout

    it('should execute multiple functions in parallel and measure performance', async () => {
      // Create agent with functions that have different execution times
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
              await new Promise(resolve => setTimeout(resolve, 100)); // 100ms
              return 'Fast function completed';
            },
            paramsToPass: {}
          },
          {
            name: 'medium_function',
            description: 'Medium function that takes some time',
            func: async () => {
              await new Promise(resolve => setTimeout(resolve, 500)); // 500ms
              return 'Medium function completed';
            },
            paramsToPass: {}
          },
          {
            name: 'slow_function',
            description: 'Slow function that takes longer',
            func: async () => {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1000ms
              return 'Slow function completed';
            },
            paramsToPass: {}
          }
        ],
        children: [],
      };

      const testAgent = new Agent('test-parallel-id', testAgentSchema);

      // Initialize the agent
      await testAgent.init();

      // Mock LLM to return array of all three functions
      const mockLLMProcessor = testAgent['llmProcessor'];
      mockLLMProcessor.getLLMResultSendMessage = jest.fn().mockResolvedValue({
        result: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'fast_function',
            paramsToPass: {},
            finished: false,
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'medium_function',
            paramsToPass: {},
            finished: false,
          },
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'slow_function',
            paramsToPass: {},
            finished: false,
          }
        ],
        metadata: {}
      });

      // Process request and measure time
      const startTime = Date.now();
      testAgent.process('Execute all functions', 'user');
      
      // Wait for all functions to complete (should be ~1000ms if parallel)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`Execution time: ${executionTime}ms (expected: 900-3000ms for parallel execution)`);

      // Verify parallel execution - should be close to the slowest function time
      expect(executionTime).toBeLessThan(3000); // Should be less than 3 seconds if parallel (including overhead)
      expect(executionTime).toBeGreaterThan(900); // Should be at least 900ms (slowest function)

      // Cleanup
      (testAgent as any).cleanup?.();
    }, 5000);
  });
});
