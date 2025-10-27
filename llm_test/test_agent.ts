import { MainAgent } from '../main-agent';
import { EAgentEvent } from '../enums';
import { IAgentSchema } from '../interfaces';
import { ELLMProvider } from '../consts';

// Test agent schema
const testAgentSchema: IAgentSchema = {
  id: 'test-agent-1',
  name: 'TestAgent',
  prompt: 'You are a test agent',
  type: 'permanent' as any,
};

// Create MainAgent with statusesForEventRaise set to [429]
const mainAgent = new MainAgent(
  'test-main-agent',
  testAgentSchema,
  {
    DEEPSEEK_KEY: 'test-key',
    DEEPSEEK_MODEL: 'deepseek-chat',
    LLM_PROVIDER: ELLMProvider.DeepSeek,
    statusesForEventRaise: [429],
  }
);

// Initialize and send a test message
async function runTest() {
  console.log('[Test] Initializing MainAgent...');
  mainAgent.init();
  
  console.log('[Test] Sending test message...');
  console.log('[Test] Make sure the test server is running on http://localhost:3001');
  console.log('[Test] And DeepSeek connector is configured to use http://localhost:3001 as baseURL\n');

  // Listen for LLM_STATUS_ERROR event
  const listener = mainAgent.getAgent('TestAgent');
  listener?.on(EAgentEvent.LLM_STATUS_ERROR, (data: { status: number; provider: string; error?: string; timestamp: Date }) => {
    console.log('\n=== LLM_STATUS_ERROR EVENT RECEIVED ===');
    console.log('Status:', data.status);
    console.log('Provider:', data.provider);
    console.log('Error:', data.error);
    console.log('Timestamp:', data.timestamp);
    console.log('=======================================\n');
  });
  
  // Send a message that will trigger the LLM call
  mainAgent.sendMessage('Hello, test message');
  
  // Keep the process alive to see the event
  setTimeout(() => {
    console.log('[Test] Test completed. You should have seen the LLM_STATUS_ERROR event above.');
    process.exit(0);
  }, 5000);
}

runTest().catch(console.error);
