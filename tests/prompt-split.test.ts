import { Agent } from '../agent';
import { EAgentType } from '../enums';

// Avoid real LLM calls and other side effects
jest.mock('../processors/llm-processor');
jest.mock('../main-agent');
jest.mock('../utils/agent-factory');

describe('Prompt building and split behavior', () => {
  it('puts entire prompt into nonCacheable when no separator and emptyBasePrompt=true', async () => {
    const schema: any = {
      id: 't-1',
      type: EAgentType.PERMANENT,
      name: 'test-agent',
      options: { emptyBasePrompt: true },
      prompt: 'Hello user! History:\n{{chat_history}}',
      flowInstructionPrompt: 'Do things only.',
    };

    const agent = new Agent(schema.id, schema);
    await agent.init();

    agent.setCtx({ inputText: 'ping', updateCtx: () => {} });
    await agent.preRequestBuildPrompt(agent.prompt, [ 'user: hi' ]);

    // Expect that with no separator, cacheable is empty and nonCacheable has full prompt
    expect(agent.splitPrompt.cacheable).toBe('');
    expect(agent.splitPrompt.nonCacheable.length).toBeGreaterThan(0);
    expect(agent.splitPrompt.nonCacheable).toContain('Hello user!');
    expect(agent.splitPrompt.nonCacheable).toContain('hi');
  });

  it('splits into cacheable/nonCacheable when separator is present', async () => {
    const schema: any = {
      id: 't-2',
      type: EAgentType.PERMANENT,
      name: 'test-agent-2',
      options: { emptyBasePrompt: true },
      prompt: 'STATIC PART\n++++dynamic_prompt_separator++++\nDYNAMIC: {{last_input}}',
    };

    const agent = new Agent(schema.id, schema);
    await agent.init();

    agent.setCtx({ inputText: 'ping', updateCtx: () => {} });
    await agent.preRequestBuildPrompt(agent.prompt, []);

    expect(agent.splitPrompt.cacheable).toContain('STATIC PART');
    expect(agent.splitPrompt.nonCacheable).toContain('DYNAMIC: ping');
  });
});
