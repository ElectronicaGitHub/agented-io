import { ELLMProvider } from '../consts';
import { LLMProcessor } from '../processors/llm-processor';
import { ILLMStreamEvent } from '../interfaces';
import { getEnvConfig } from '../utils/env-utils';

const env = getEnvConfig({
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  OPENAI_KEY: 'test-openai-key',
  DEEPSEEK_KEY: 'test-deepseek-key',
  GROK_KEY: 'test-grok-key',
  LLM_PROVIDER: ELLMProvider.DeepSeek,
  FAST_REQUEST_LLM_PROVIDER: ELLMProvider.DeepSeek,
  LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK: ELLMProvider.Anthropic,
  LLM_RESULT_TIMEOUT_MS: 1_000,
  statusesForEventRaise: [],
});

describe('LLM streaming lifecycle', () => {
  it('emits start, deltas and end while preserving the complete parsed response', async () => {
    const processor = new LLMProcessor(() => env);
    const connector = {
      sendChatMessage: jest.fn(async (_prompt, _model, _signal, onChunk) => {
        onChunk?.('{"actions":[');
        onChunk?.('{"type":"text","text":"hello"}],"finished":true}');
        return {
          result: '{"actions":[{"type":"text","text":"hello"}],"finished":true}',
          metadata: { inputTokens: 2, outputTokens: 3, cachedTokens: 0, nonCachedTokens: 2, modelUsed: 'deepseek-test' },
        };
      }),
    };
    (processor as any).connectors = { [ELLMProvider.DeepSeek]: connector };

    const events: ILLMStreamEvent[] = [];
    const response = await processor.getLLMResultSendMessage('prompt', false, undefined, {
      streamId: 'stream-1',
      onEvent: event => events.push(event),
    });

    expect(response.result.actions[0].text).toBe('hello');
    expect(events.map(event => event.phase)).toEqual(['start', 'delta', 'delta', 'end']);
    expect(events.every(event => event.streamId === 'stream-1')).toBe(true);
    expect(new Set(events.map(event => event.attemptId)).size).toBe(1);
  });

  it('resets a failed partial stream before starting the fallback provider', async () => {
    const processor = new LLMProcessor(() => env);
    const primary = {
      sendChatMessage: jest.fn(async (_prompt, _model, _signal, onChunk) => {
        onChunk?.('partial');
        return { error: 'network error', httpStatus: 503 };
      }),
    };
    const fallback = {
      sendChatMessage: jest.fn(async (_prompt, _model, _signal, onChunk) => {
        const result = '{"actions":[],"finished":true}';
        onChunk?.(result);
        return {
          result,
          metadata: { inputTokens: 1, outputTokens: 1, cachedTokens: 0, nonCachedTokens: 1, modelUsed: 'claude-test' },
        };
      }),
    };
    (processor as any).connectors = {
      [ELLMProvider.DeepSeek]: primary,
      [ELLMProvider.Anthropic]: fallback,
    };

    const events: ILLMStreamEvent[] = [];
    await processor.getLLMResultSendMessage('prompt', false, undefined, {
      streamId: 'stream-2',
      onEvent: event => events.push(event),
    });

    expect(events.map(event => event.phase)).toEqual(['start', 'delta', 'reset', 'start', 'delta', 'end']);
    expect(events[0].attemptId).not.toBe(events[3].attemptId);
  });

  it('does not fall back after an external abort', async () => {
    const processor = new LLMProcessor(() => env);
    const controller = new AbortController();
    const primary = {
      sendChatMessage: jest.fn(async (_prompt, _model, signal, onChunk) => {
        onChunk?.('partial');
        controller.abort();
        await new Promise((_, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true }));
        return { result: '' };
      }),
    };
    const fallback = { sendChatMessage: jest.fn() };
    (processor as any).connectors = {
      [ELLMProvider.DeepSeek]: primary,
      [ELLMProvider.Anthropic]: fallback,
    };

    await expect(processor.getLLMResultSendMessage('prompt', false, controller.signal, {
      streamId: 'stream-3',
      onEvent: () => undefined,
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fallback.sendChatMessage).not.toHaveBeenCalled();
  });
});
