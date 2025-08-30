import { LLMProcessor } from '../processors/llm-processor';

// Mock the LLM connectors
jest.mock('../llm-connectors/anthropic.connector');
jest.mock('../llm-connectors/openai.connector');
jest.mock('../llm-connectors/deepseek.connector');

describe('LLMProcessor', () => {
  let llmProcessor: LLMProcessor;

  beforeEach(() => {
    // Create a new instance before each test
    llmProcessor = new LLMProcessor();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should fallback to substitute provider on timeout', async () => {
    // Mock the tryLLMProviderSendMessage method
    const mockTryLLMProviderSendMessage = jest.spyOn(llmProcessor as any, 'tryLLMProviderSendMessage');
    
    // First call will be treated as timeout (error), second will succeed
    mockTryLLMProviderSendMessage
      .mockImplementationOnce(() => {
        // corresponds to: [result=null, error=Error]
        return Promise.resolve([null, new Error('LLM request timeout')]);
      })
      .mockImplementationOnce(() => {
        // corresponds to: [result={result, metadata}, error=null]
        return Promise.resolve([
          {
            result: 'Successful response from fallback provider',
            metadata: { inputTokens: 10, outputTokens: 5 },
          },
          null,
        ]);
      });

    // Call the method being tested
    const response = await llmProcessor.getLLMResultSendMessage('Test message');

    // Verify the response
    expect(response.result).toBe('Successful response from fallback provider');
    expect(response.metadata.inputTokens).toBe(10);
    expect(response.metadata.outputTokens).toBe(5);
    
    // Verify the fallback behavior was triggered
    expect(mockTryLLMProviderSendMessage).toHaveBeenCalledTimes(2);
  });

  it('should handle successful response from first provider', async () => {
    // Mock the tryLLMProviderSendMessage method
    const mockTryLLMProviderSendMessage = jest.spyOn(llmProcessor as any, 'tryLLMProviderSendMessage');
    
    // First call will succeed
    mockTryLLMProviderSendMessage.mockImplementationOnce(() => {
      return Promise.resolve([
        { result: 'Successful response from primary provider', metadata: { inputTokens: 8, outputTokens: 4 } },
        null,
      ]);
    });

    // Call the method being tested
    const response = await llmProcessor.getLLMResultSendMessage('Test message');

    // Verify the response
    expect(response.result).toBe('Successful response from primary provider');
    expect(response.metadata.inputTokens).toBe(8);
    expect(response.metadata.outputTokens).toBe(4);
    
    // Verify no fallback was needed
    expect(mockTryLLMProviderSendMessage).toHaveBeenCalledTimes(1);
  });
});