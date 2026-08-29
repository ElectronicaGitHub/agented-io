export function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export async function withAbortableTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  ms: number,
  errorMessage: string,
  externalSignal?: AbortSignal,
): Promise<T> {
  if (externalSignal?.aborted) {
    const error = new Error('Request aborted');
    error.name = 'AbortError';
    throw error;
  }

  const controller = new AbortController();
  let rejectOnExternalAbort: ((reason: Error) => void) | undefined;
  const externalAbort = new Promise<never>((_, reject) => {
    rejectOnExternalAbort = reject;
  });
  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
    const error = new Error('Request aborted');
    error.name = 'AbortError';
    rejectOnExternalAbort?.(error);
  };
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(new Error(errorMessage));
      reject(new Error(errorMessage));
    }, ms);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout, externalAbort]);
  } finally {
    clearTimeout(timeoutId!);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export async function withTimeoutSettled<T>(
  promise: Promise<T>, 
  ms: number, 
  timeoutValue: T
): Promise<T> {
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => resolve(timeoutValue), ms);
  });
  return Promise.race([promise, timeout]);
}
