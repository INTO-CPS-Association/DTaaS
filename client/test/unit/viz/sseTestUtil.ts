/** Fake fetch answers for the server-sent event tests. */

type Chunk = string | Uint8Array;

const bytes = (chunk: Chunk) =>
  typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;

/** A body that hands out `chunks` and ends. */
export function bodyOf(chunks: readonly Chunk[]): ReadableStream<Uint8Array> {
  const queue = chunks.map(bytes);
  return {
    getReader: () => ({
      read: async () =>
        queue.length > 0
          ? { done: false, value: queue.shift() }
          : { done: true, value: undefined },
    }),
  } as unknown as ReadableStream<Uint8Array>;
}

export function answerOf(chunks: readonly Chunk[], status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: bodyOf(chunks),
  } as unknown as Response;
}

/**
 * A body that stays open until the test ends it or the request is aborted,
 * and hands out what the test sends meanwhile.
 */
export function openBody(signal: AbortSignal) {
  const queue: Uint8Array[] = [];
  let ended = false;
  const waiters: (() => void)[] = [];
  const wake = () => waiters.splice(0).forEach((resolve) => resolve());
  signal.addEventListener('abort', wake);
  const arrival = () =>
    new Promise<void>((resolve) => {
      waiters.push(resolve);
    });
  const next = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    if (queue.length === 0 && !ended && !signal.aborted) await arrival();
    if (signal.aborted) throw new Error('aborted');
    const value = queue.shift();
    if (value) return { done: false, value };
    return ended ? { done: true, value: undefined } : next();
  };
  return {
    body: { getReader: () => ({ read: next }) } as ReadableStream<Uint8Array>,
    send(text: string) {
      queue.push(bytes(text));
      wake();
    },
    end() {
      ended = true;
      wake();
    },
  };
}

/** A fetch whose every request opens a stream the test can write to. */
export function streamingFetch() {
  const streams: ReturnType<typeof openBody>[] = [];
  const fetch = jest.fn(async (_url: string, init: RequestInit) => {
    const stream = openBody(init.signal as AbortSignal);
    streams.push(stream);
    return { ok: true, status: 200, body: stream.body } as Response;
  });
  return { fetch, streams };
}
