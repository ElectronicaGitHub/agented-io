import { MainAgent } from '../main-agent';
import { EAgentEvent } from '../enums';
import { IAgentSchema } from '../interfaces';
import { ELLMProvider } from '../consts';

// Test agent schema
const testAgentSchema: IAgentSchema = {
  id: 'test-agent-1',
  name: 'TestAgent',
  prompt: 'You are a test agent, respond with a joke',
  type: 'permanent' as any,
};

// Create MainAgent with statusesForEventRaise set to [429]
const mainAgent = new MainAgent(
  'test-main-agent',
  testAgentSchema,
  {
    DEEPSEEK_KEY: 'test-key',
    LLM_PROVIDER: ELLMProvider.DeepSeek,
    LOG_PROMPT: true,
    LOG_RESPONSE: true,
    statusesForEventRaise: [429],
  }
);

// Initialize and send a test message
async function runTest() {
  console.log('[Test] Initializing MainAgent...');
  mainAgent.init();
  
  console.log('[Test] Sending test message...');
  // console.log('[Test] Make sure the test server is running on http://localhost:3001');
  // console.log('[Test] And DeepSeek connector is configured to use http://localhost:3001 as baseURL\n');

  // Listen for LLM_STATUS_ERROR event
  const listener = mainAgent.getAgent('TestAgent');
  listener?.on(EAgentEvent.LLM_STATUS_ERROR, async (data: { status: number; provider: string; error?: string; timestamp: Date }) => {
    console.log('\n=== LLM_STATUS_ERROR EVENT RECEIVED ===');
    console.log('Status:', data.status);
    console.log('Provider:', data.provider);
    console.log('Error:', data.error);
    console.log('Timestamp:', data.timestamp);
    console.log('=======================================\n');

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('=======================================\n');
    console.log('=======================================\n');

    setTimeout(() => {
      mainAgent.updateEnvOptions({
        DEEPSEEK_KEY: 'DEEPSEEK UPDATED KEY'
      });
      mainAgent.retryLastMessage();
    }, 1000);
  });

  // Listen for MAIN_RESPONSE event to check token usage
  listener?.on(EAgentEvent.MAIN_RESPONSE, (event: any) => {
    console.log('\n=== MAIN_RESPONSE EVENT RECEIVED ===');
    console.log('Sender:', event.sender);
    console.log('Text:', event.text.substring(0, 100) + (event.text.length > 100 ? '...' : ''));
    console.log('Token Usage:');
    if (event.metadata) {
      console.log('  Model Used:', event.metadata.modelUsed);
      console.log('  Input Tokens:', event.metadata.inputTokens);
      console.log('  Output Tokens:', event.metadata.outputTokens);
      console.log('  Cached Tokens:', event.metadata.cachedTokens);
      console.log('  Non-Cached Tokens:', event.metadata.nonCachedTokens);
      console.log('  Symbol per Token:', event.metadata.symbolPerToken);
      if (event.metadata.providerRawUsage) {
        console.log('  Raw Usage:', JSON.stringify(event.metadata.providerRawUsage, null, 2));
      }
    } else {
      console.log('  No metadata available');
    }
    console.log('=====================================\n');
  });
  
  // Send a message that will trigger the LLM call
  setTimeout(() => {
    mainAgent.sendMessage('Hello, test message');
  }, 100);
  
  // Keep the process alive to see the event
  setTimeout(() => {
    console.log('[Test] Test completed. You should have seen the LLM_STATUS_ERROR event above.');
    process.exit(0);
  }, 5000);
}

runTest().catch(console.error);
