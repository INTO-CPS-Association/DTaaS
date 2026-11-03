import { createSseParser, openSse, type SseEvent } from 'viz/sseStream';
import { answerOf } from 'test/unit/viz/sseTestUtil';

function parse(chunks: readonly string[]) {
  const events: SseEvent[] = [];
  const parser = createSseParser((event) => events.push(event));
  chunks.forEach((chunk) => parser.push(chunk));
  return { events, retryMs: parser.retryMs() };
}

describe('the event stream parser', () => {
  it('builds an event from lines cut anywhere across chunks', () => {
    const { events } = parse([
      'eve',
      'nt: sam',
      'ple\nda',
      'ta: {"a"',
      ':1}\n',
      '\n',
    ]);

    expect(events).toEqual([{ event: 'sample', data: '{"a":1}' }]);
  });

  it('skips comments, joins data lines and names a bare event message', () => {
    const { events } = parse([': keep-alive\n\n', 'data: one\ndata: two\n\n']);

    expect(events).toEqual([{ event: 'message', data: 'one\ntwo' }]);
  });

  it('reads lines ended by a carriage return and a line feed', () => {
    const { events } = parse(['event: state\r\ndata: {}\r', '\n\r\n']);

    expect(events).toEqual([{ event: 'state', data: '{}' }]);
  });

  it('keeps the last valid retry and dispatches nothing for it', () => {
    const { events, retryMs } = parse(['retry: 2000\n', 'retry: soon\n\n']);

    expect(events).toEqual([]);
    expect(retryMs).toBe(2000);
  });

  it('holds an event until the blank line that ends it', () => {
    const { events } = parse(['event: state\ndata: {}\n']);

    expect(events).toEqual([]);
  });
});

describe('opening a stream', () => {
  const { signal } = new AbortController();

  it('posts the body as JSON with the headers it is given', async () => {
    const fetch = jest.fn(async () => answerOf(['data: x\n\n']));
    const onEvent = jest.fn();

    await openSse(
      'https://gw/stream',
      { paths: ['a'] },
      { Authorization: 'Bearer t' },
      onEvent,
      signal,
      fetch,
    );

    expect(fetch).toHaveBeenCalledWith(
      'https://gw/stream',
      expect.objectContaining({
        method: 'POST',
        body: '{"paths":["a"]}',
        signal,
        headers: expect.objectContaining({
          Authorization: 'Bearer t',
          Accept: 'text/event-stream',
        }),
      }),
    );
    expect(onEvent).toHaveBeenCalledWith({ event: 'message', data: 'x' });
  });

  it('decodes a character whose bytes arrive in two chunks', async () => {
    const degree = new TextEncoder().encode('data: °\n\n');
    const fetch = async () => answerOf([degree.slice(0, 7), degree.slice(7)]);
    const onEvent = jest.fn();

    await openSse('u', {}, {}, onEvent, signal, fetch);

    expect(onEvent).toHaveBeenCalledWith({ event: 'message', data: '°' });
  });

  it('resolves with the retry the server asked for when it ends the stream', async () => {
    const fetch = async () => answerOf(['retry: 900\n\n']);

    await expect(
      openSse('u', {}, {}, jest.fn(), signal, fetch),
    ).resolves.toEqual({ retryMs: 900 });
  });

  it('rejects a refused stream with its status', async () => {
    const fetch = async () => answerOf([], 401);

    await expect(
      openSse('u', {}, {}, jest.fn(), signal, fetch),
    ).rejects.toThrow('401');
  });
});
