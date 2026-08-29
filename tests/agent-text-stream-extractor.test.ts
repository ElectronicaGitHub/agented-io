import { AgentTextStreamExtractor } from '../utils/agent-text-stream-extractor';

describe('AgentTextStreamExtractor', () => {
  it('streams only text-action content across arbitrary chunk boundaries', () => {
    const extractor = new AgentTextStreamExtractor();

    expect(extractor.push('{"actions":[{"type":"te')).toBe('');
    expect(extractor.push('xt","text":"Hel')).toBe('Hel');
    expect(extractor.push('lo\\nwor')).toBe('lo\nwor');
    expect(extractor.push('ld"}],"finished":true}')).toBe('ld');
  });

  it('does not expose function parameters or agent instructions', () => {
    const extractor = new AgentTextStreamExtractor();
    const raw = JSON.stringify({
      actions: [
        { type: 'function', functionName: 'saveSecret', paramsToPass: { text: 'private-value' } },
        { type: 'agent', name: 'worker', specialInstructions: 'internal-instruction' },
      ],
      finished: false,
    });

    expect(extractor.push(raw)).toBe('');
  });

  it('decodes split unicode escapes without emitting broken characters', () => {
    const extractor = new AgentTextStreamExtractor();

    expect(extractor.push('{"actions":[{"type":"text","text":"A\\u0')).toBe('A');
    expect(extractor.push('411B"}],"finished":true}')).toBe('БB');
  });

  it('clears provisional state on reset', () => {
    const extractor = new AgentTextStreamExtractor();
    expect(extractor.push('{"type":"text","text":"old')).toBe('old');
    extractor.reset();
    expect(extractor.push('{"type":"text","text":"new"}')).toBe('new');
  });
});
