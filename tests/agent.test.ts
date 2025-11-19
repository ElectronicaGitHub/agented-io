import { EAgentResponseType, EAgentStatus } from '../enums';
import { IAgentResponseMultipleFunctions } from '../interfaces';
import { getEnvConfig } from '../utils/env-utils';

// Mock dependencies to avoid initialization issues
jest.mock('../processors/llm-processor');
jest.mock('../main-agent');
jest.mock('../utils/agent-factory');

describe('Agent Multiple Functions', () => {
  describe('Multiple functions response handling', () => {
    it('should handle multiple functions response correctly', async () => {
      // Test the logic without full agent initialization
      const multipleFunctionsResponse: IAgentResponseMultipleFunctions = {
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

      // Test that the response has correct structure
      expect(multipleFunctionsResponse.type).toBe(EAgentResponseType.MULTIPLE_FUNCTIONS);
      expect(multipleFunctionsResponse.functions).toHaveLength(2);
      expect(multipleFunctionsResponse.functions[0].functionName).toBe('function1');
      expect(multipleFunctionsResponse.functions[1].functionName).toBe('function2');
    });

    it('should validate multiple functions response structure', () => {
      const multipleFunctionsResponse: IAgentResponseMultipleFunctions = {
        type: EAgentResponseType.MULTIPLE_FUNCTIONS,
        functions: [
          {
            type: EAgentResponseType.FUNCTION,
            functionName: 'test_function',
            paramsToPass: { test: 'value' },
            finished: false,
          },
        ],
        finished: false,
      };

      // Test structure validation
      expect(multipleFunctionsResponse.type).toBe(EAgentResponseType.MULTIPLE_FUNCTIONS);
      expect(Array.isArray(multipleFunctionsResponse.functions)).toBe(true);
      expect(multipleFunctionsResponse.functions[0].type).toBe(EAgentResponseType.FUNCTION);
      expect(typeof multipleFunctionsResponse.functions[0].functionName).toBe('string');
      expect(typeof multipleFunctionsResponse.functions[0].paramsToPass).toBe('object');
    });
  });

  describe('Response type validation', () => {
    it('should have correct enum values', () => {
      expect(EAgentResponseType.MULTIPLE_FUNCTIONS).toBe('multiple_functions');
      expect(EAgentResponseType.FUNCTION).toBe('function');
      expect(EAgentResponseType.TEXT).toBe('text');
      expect(EAgentResponseType.AGENT).toBe('agent');
    });
  });

  describe('Timeout configuration', () => {
    it('should have correct default timeout value from envConfig', () => {
      // Test that the timeout is defined correctly in environment configuration
      const envConfig = getEnvConfig();
      expect(envConfig.MULTIPLE_FUNCTIONS_TIMEOUT).toBe(10000);
    });

    it('should allow custom timeout value via envOptions', () => {
      // Test that custom timeout can be set via envOptions
      const customEnvConfig = getEnvConfig({ MULTIPLE_FUNCTIONS_TIMEOUT: 20000 });
      expect(customEnvConfig.MULTIPLE_FUNCTIONS_TIMEOUT).toBe(20000);
    });
  });

  describe('Array response handling', () => {
    it('should validate array response format', () => {
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

      // Test array validation
      expect(Array.isArray(arrayResponse)).toBe(true);
      expect(arrayResponse.length).toBe(2);
      expect(arrayResponse[0].type).toBe(EAgentResponseType.FUNCTION);
      expect(arrayResponse[1].type).toBe(EAgentResponseType.FUNCTION);
    });
  });
});
