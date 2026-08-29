import { withAbortableTimeout } from '../utils/promise-utils';

describe('withAbortableTimeout', () => {
  it('aborts the operation when the timeout expires', async () => {
    let operationSignal: AbortSignal | undefined;
    const operation = (signal: AbortSignal) => {
      operationSignal = signal;
      return new Promise<string>(() => undefined);
    };

    await expect(withAbortableTimeout(operation, 10, 'timed out')).rejects.toThrow('timed out');
    expect(operationSignal?.aborted).toBe(true);
  });

  it('propagates an external abort without waiting for the timeout', async () => {
    const controller = new AbortController();
    const operation = () => new Promise<string>(() => undefined);
    const result = withAbortableTimeout(operation, 10_000, 'timed out', controller.signal);

    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
