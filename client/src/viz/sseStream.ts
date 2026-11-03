/**
 * Server-sent events read through fetch, so a stream can carry a header.
 *
 * `EventSource` sends no `Authorization` header, and the signals gateway needs
 * the user's token on every stream. So the stream is a POST read through
 * fetch, and its text is cut into events here by the rules of the event
 * stream format: a blank line ends an event, a line that starts with `:` is a
 * comment (the gateway's keep-alive), and `retry:` names how long to wait
 * before connecting again.
 *
 * The body is decoded with a streaming `TextDecoder` and not with a
 * `TextDecoderStream`, because the test environment has no `TextDecoderStream`
 * and the two decode the same way.
 */

export interface SseEvent {
  readonly event: string;
  readonly data: string;
}

export interface SseResult {
  /** The last `retry:` the server sent, in milliseconds. */
  readonly retryMs?: number;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** The name and value of one field line, with the one optional space cut. */
function fieldOf(line: string): [string, string] {
  const colon = line.indexOf(':');
  if (colon === -1) return [line, ''];
  const value = line.slice(colon + 1);
  return [line.slice(0, colon), value.startsWith(' ') ? value.slice(1) : value];
}

/** Turn lines into events, keeping the last `retry:` the server sent. */
function eventBuilder(onEvent: (event: SseEvent) => void) {
  let name = '';
  let data: string[] = [];
  let retryMs: number | undefined;
  const line = (text: string) => {
    if (text === '') {
      if (data.length > 0)
        onEvent({ event: name || 'message', data: data.join('\n') });
      name = '';
      data = [];
      return;
    }
    if (text.startsWith(':')) return;
    const [field, value] = fieldOf(text);
    if (field === 'event') name = value;
    else if (field === 'data') data.push(value);
    else if (field === 'retry' && /^\d+$/.test(value)) retryMs = Number(value);
  };
  return { line, retryMs: () => retryMs };
}

/**
 * A parser fed text as it arrives, in chunks that may end inside a line.
 *
 * Lines end in `\n`, and a `\r` before it is dropped. A line ended by `\r`
 * alone, which the format also allows, is not split, since the gateway never
 * writes one.
 */
export function createSseParser(onEvent: (event: SseEvent) => void) {
  const builder = eventBuilder(onEvent);
  let buffer = '';
  return {
    push(text: string) {
      buffer += text;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach((line) => builder.line(line.replace(/\r$/, '')));
    },
    retryMs: builder.retryMs,
  };
}

async function readText(
  body: ReadableStream<Uint8Array>,
  push: (text: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    // Each chunk can only be read once the one before it has arrived. A loop
    // and not a recursion, so a stream open for hours holds no promise chain.
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;
    push(decoder.decode(value, { stream: true }));
  }
  push(decoder.decode());
}

/**
 * POST `body` as JSON to `url` and hand each event of the answer to
 * `onEvent`. Resolves when the server ends the stream, and rejects when the
 * request fails, is refused or is aborted through `signal`.
 */
export async function openSse(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
  fetchImpl: FetchLike = (target, init) => fetch(target, init),
): Promise<SseResult> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      ...headers,
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`${url} refused the stream with ${response.status}`);
  }
  const parser = createSseParser(onEvent);
  await readText(response.body, parser.push);
  return { retryMs: parser.retryMs() };
}
