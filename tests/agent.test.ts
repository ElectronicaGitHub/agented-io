import { EAgentResponseType, EAgentStatus, EAgentType, EAgentEvent } from '../enums';
import { IAgentResponse, IAgentSchema, IAgentMessage } from '../interfaces';
import { getEnvConfig } from '../utils/env-utils';
import { Agent } from '../agent';
import { MainAgent } from '../main-agent';
import { LLMProcessor } from '../processors/llm-processor';

// Mock LLM processor
jest.mock('../processors/llm-processor');

// Mock node-schedule to prevent cron jobs
jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn(),
}));

/**
 * Helper: create a minimal agent wired to a MainAgent with mocked LLM.
 * Calls init() internally and returns a ready-to-use agent.
 */
async function createTestAgent(opts: {
  llmResponses: IAgentResponse[];
  functions?: IAgentSchema['functions'];
  children?: IAgentSchema[];
}) {
  const { llmResponses, functions = [], children = [] } = opts;

  const schema: IAgentSchema = {
    id: 'test-agent-id',
    type: EAgentType.PERMANENT,
    name: 'test-agent',
    prompt: 'You are a test agent',
    functions,
    children,
  };

  const mainAgent = new MainAgent('main-id', schema, {
    LLM_MAX_RETRIES: 1,
    LLM_RETRY_DELAY_MS: 0,
    MAX_NUMBER_OF_TRIES_IN_FLOW: 10,
    MULTIPLE_FUNCTIONS_TIMEOUT: 5000,
    DEFAULT_WORK_TIMEOUT: 30000,
  });

  const agent = new Agent('agent-id', schema, undefined, mainAgent);
  mainAgent.addAgent(agent);

  // Mock LLM to return responses in sequence
  let callIndex = 0;
  const mockGetLLMResult = jest.fn().mockImplementation(() => {
    const response = llmResponses[callIndex] || llmResponses[llmResponses.length - 1];
    callIndex++;
    return Promise.resolve({
      result: response,
      metadata: { inputTokens: 10, outputTokens: 5, cachedTokens: 0, nonCachedTokens: 10, modelUsed: 'test-model' },
    });
  });

  (agent as any).llmProcessor.getLLMResultSendMessage = mockGetLLMResult;

  await agent.init();

  // Also mock LLM for any child agents that were created during init
  for (const child of agent.children) {
    (child as any).llmProcessor.getLLMResultSendMessage = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        result: { actions: [{ type: EAgentResponseType.TEXT, text: 'child default' }], finished: true },
        metadata: { inputTokens: 5, outputTokens: 3, cachedTokens: 0, nonCachedTokens: 5, modelUsed: 'test' },
      });
    });
  }

  return { agent, mainAgent, mockGetLLMResult };
}

/**
 * Helper: wait for an event to fire on an agent, with timeout.
 */
function waitForEvent(agent: any, event: string, timeoutMs = 3000): Promise<IAgentMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for event ${event}`)), timeoutMs);
    agent.on(event, (msg: IAgentMessage) => {
      clearTimeout(timer);
      resolve(msg);
    });
  });
}

describe('Agent Unified Actions Response', () => {

  describe('Text-only response (finished)', () => {
    it('should emit MAIN_RESPONSE and stop processing', async () => {
      const textResponse: IAgentResponse = {
        actions: [{ type: EAgentResponseType.TEXT, text: 'Hello user!' }],
        finished: true,
      };

      const { agent } = await createTestAgent({ llmResponses: [textResponse] });

      const promise = waitForEvent(agent, EAgentEvent.MAIN_RESPONSE);
      agent.process('hi', 'user');
      const msg = await promise;

      expect(msg.text).toBe('Hello user!');
      expect(agent.currentStatus).toBe(EAgentStatus.IDLE);
    });
  });

  describe('Single function call', () => {
    it('should execute function and feed result back to LLM', async () => {
      const fnCallResponse: IAgentResponse = {
        actions: [{ type: EAgentResponseType.FUNCTION, functionName: 'getWeather', paramsToPass: { city: 'Moscow' } }],
        finished: false,
      };
      const finalResponse: IAgentResponse = {
        actions: [{ type: EAgentResponseType.TEXT, text: 'Weather in Moscow is sunny' }],
        finished: true,
      };

      const mockFn = jest.fn().mockResolvedValue('sunny, 25C');

      const { agent, mockGetLLMResult } = await createTestAgent({
        llmResponses: [fnCallResponse, finalResponse],
        functions: [{ name: 'getWeather', description: 'Get weather', func: mockFn, paramsToPass: { city: 'string' } }],
      });

      const promise = waitForEvent(agent, EAgentEvent.MAIN_RESPONSE);
      agent.process('What is the weather?', 'user');
      const msg = await promise;

      expect(msg.text).toBe('Weather in Moscow is sunny');
      expect(mockFn).toHaveBeenCalledWith({ city: 'Moscow' }, expect.any(Object));
      expect(mockGetLLMResult).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multiple parallel functions', () => {
    it('should execute all functions in parallel and feed results back', async () => {
      const multiFnResponse: IAgentResponse = {
        actions: [
          { type: EAgentResponseType.FUNCTION, functionName: 'fn1', paramsToPass: { a: '1' } },
          { type: EAgentResponseType.FUNCTION, functionName: 'fn2', paramsToPass: { b: '2' } },
        ],
        finished: false,
      };
      const finalResponse: IAgentResponse = {
        actions: [{ type: EAgentResponseType.TEXT, text: 'Both done' }],
        finished: true,
      };

      const mockFn1 = jest.fn().mockResolvedValue('result1');
      const mockFn2 = jest.fn().mockResolvedValue('result2');

      const { agent, mockGetLLMResult } = await createTestAgent({
        llmResponses: [multiFnResponse, finalResponse],
        functions: [
          { name: 'fn1', description: 'Function 1', func: mockFn1, paramsToPass: { a: 'string' } },
          { name: 'fn2', description: 'Function 2', func: mockFn2, paramsToPass: { b: 'string' } },
        ],
      });

      const promise = waitForEvent(agent, EAgentEvent.MAIN_RESPONSE);
      agent.process('Do both things', 'user');
      const msg = await promise;

      expect(msg.text).toBe('Both done');
      expect(mockFn1).toHaveBeenCalled();
      expect(mockFn2).toHaveBeenCalled();
      expect(mockGetLLMResult).toHaveBeenCalledTimes(2);
    });
  });

  describe('Text + function in same response', () => {
    it('should emit text to user immediately AND execute function', async () => {
      const compositeResponse: IAgentResponse = {
        actions: [
          { type: EAgentResponseType.TEXT, text: 'Working on it...' },
          { type: EAgentResponseType.FUNCTION, functionName: 'doWork', paramsToPass: {} },
        ],
        finished: false,
      };
      const finalResponse: IAgentResponse = {
        actions: [{ type: EAgentResponseType.TEXT, text: 'Done!' }],
        finished: true,
      };

      const mockFn = jest.fn().mockResolvedValue('work completed');

      const { agent } = await createTestAgent({
        llmResponses: [compositeResponse, finalResponse],
        functions: [{ name: 'doWork', description: 'Do work', func: mockFn }],
      });

      const emittedTexts: string[] = [];
      agent.on(EAgentEvent.RESPONSE, (msg: IAgentMessage) => {
        if (msg.type === EAgentResponseType.TEXT) {
          emittedTexts.push(msg.text);
        }
      });

      const promise = waitForEvent(agent, EAgentEvent.MAIN_RESPONSE);
      agent.process('Do something', 'user');
      const msg = await promise;

      expect(emittedTexts).toContain('Working on it...');
      expect(mockFn).toHaveBeenCalled();
      expect(msg.text).toBe('Done!');
    });
  });

  describe('Agent (sub-agent) action', () => {
    it('should launch child agent with specialInstructions', async () => {
      const agentResponse: IAgentResponse = {
        actions: [{ type: EAgentResponseType.AGENT, name: 'child-agent', specialInstructions: 'Do the task' }],
        finished: false,
      };

      const childSchema: IAgentSchema = {
        id: 'child-id',
        type: EAgentType.PERMANENT,
        name: 'child-agent',
        prompt: 'You are a child agent',
      };

      const { agent } = await createTestAgent({
        llmResponses: [agentResponse],
        children: [childSchema],
      });

      const childAgent = agent.children.find((c: any) => c.name === 'child-agent');
      expect(childAgent).toBeDefined();

      // Spy on child's process method
      const processSpy = jest.fn();
      const originalProcess = childAgent!.process.bind(childAgent);
      childAgent!.process = ((text: string, sender: string) => {
        processSpy(text, sender);
        // Don't call original to avoid further processing loops
      }) as any;

      agent.process('Delegate this', 'user');

      // Give time for async processing
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(processSpy).toHaveBeenCalledWith('Do the task', 'test-agent');
    });
  });

  describe('Response validation', () => {
    it('should error when response has no actions array', async () => {
      const invalidResponse = { text: 'no actions' } as any;

      const { agent, mockGetLLMResult } = await createTestAgent({
        llmResponses: [invalidResponse],
      });

      const promise = new Promise<void>((resolve) => {
        agent.on(EAgentEvent.STATUS_CHANGED, (data: any) => {
          if (data.status === EAgentStatus.ERROR) {
            resolve();
          }
        });
      });

      agent.process('test', 'user');
      await promise;

      expect(mockGetLLMResult).toHaveBeenCalledTimes(1);
    });
  });

  describe('Enum values', () => {
    it('should have correct enum values', () => {
      expect(EAgentResponseType.FUNCTION).toBe('function');
      expect(EAgentResponseType.TEXT).toBe('text');
      expect(EAgentResponseType.AGENT).toBe('agent');
      expect(EAgentResponseType.COMMAND).toBe('command');
    });
  });

  describe('Timeout configuration', () => {
    it('should have correct default timeout value from envConfig', () => {
      const envConfig = getEnvConfig();
      expect(envConfig.MULTIPLE_FUNCTIONS_TIMEOUT).toBe(10000);
    });

    it('should allow custom timeout value via envOptions', () => {
      const customEnvConfig = getEnvConfig({ MULTIPLE_FUNCTIONS_TIMEOUT: 20000 });
      expect(customEnvConfig.MULTIPLE_FUNCTIONS_TIMEOUT).toBe(20000);
    });
  });

  describe('Unified response structure', () => {
    it('should accept text-only response', () => {
      const response: IAgentResponse = {
        actions: [{ type: EAgentResponseType.TEXT, text: 'hello' }],
        finished: true,
      };
      expect(response.actions).toHaveLength(1);
      expect(response.actions[0].type).toBe(EAgentResponseType.TEXT);
      expect(response.finished).toBe(true);
    });

    it('should accept mixed actions response', () => {
      const response: IAgentResponse = {
        actions: [
          { type: EAgentResponseType.TEXT, text: 'Starting...' },
          { type: EAgentResponseType.FUNCTION, functionName: 'fn1', paramsToPass: { key: 'val' } },
          { type: EAgentResponseType.AGENT, name: 'child', specialInstructions: 'do it' },
        ],
        finished: false,
        explanation: 'Doing multiple things at once',
      };
      expect(response.actions).toHaveLength(3);
      expect(response.actions[0].type).toBe(EAgentResponseType.TEXT);
      expect(response.actions[1].type).toBe(EAgentResponseType.FUNCTION);
      expect(response.actions[2].type).toBe(EAgentResponseType.AGENT);
      expect(response.finished).toBe(false);
    });

    it('should accept empty actions with finished true', () => {
      const response: IAgentResponse = {
        actions: [],
        finished: true,
      };
      expect(response.actions).toHaveLength(0);
      expect(response.finished).toBe(true);
    });
  });
});
