export function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  const timeout = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeout]);
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