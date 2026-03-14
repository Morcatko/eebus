export async function streamToAsyncGenerator<T>(
  subscribe: (onMessage: (msg: T) => void, onEnd: () => void, onError: (err: Error) => void) => Promise<() => void>,
  signal?: AbortSignal
): Promise<AsyncGenerator<T>> {
  const queue: T[] = [];
  let resolve: (() => void) | null = null;
  let done = false;
  let error: Error | null = null;

  function wake() { resolve?.(); resolve = null; }

  const unsubscribe = await subscribe(
    (msg) => { queue.push(msg); wake(); },
    ()    => { done = true;     wake(); },
    (err) => { error = err;     wake(); }
  );

  function cleanup() {
    done = true;
    unsubscribe();
    signal?.removeEventListener('abort', onAbort);
    wake();
  }

  function onAbort() {
    error = new DOMException('Aborted', 'AbortError');
    cleanup();
  }

  if (signal?.aborted) {
    onAbort();
  } else {
    signal?.addEventListener('abort', onAbort, { once: true });
  }

  return {
    [Symbol.asyncIterator]() { return this; },
    [Symbol.asyncDispose]() { return this.return(); },

    async next() {
      while (true) {
        if (queue.length > 0)  return { value: queue.shift()!, done: false };
        if (error)             throw error;
        if (done)              return { value: undefined as any, done: true };

        await new Promise<void>(r => { resolve = r; });
      }
    },

    async return() {
      cleanup();
      return { value: undefined as any, done: true };
    },

    async throw(err) {
      error = err;
      cleanup();
      throw err;
    }
  };
}