import createGatewayTransport, {
  RECONNECT_DELAY_MS,
  REOPEN_DELAY_MS,
} from 'viz/gatewayTransport';
import { streamingFetch } from 'test/unit/viz/sseTestUtil';

const TOKEN = 'glpat-secret-token';

function gateway() {
  const { fetch, streams } = streamingFetch();
  const transport = createGatewayTransport({
    url: 'https://signals.example/',
    token: () => TOKEN,
    fetch,
  });
  const bodyOf = (call: number) =>
    JSON.parse(fetch.mock.calls[call][1].body as string) as { paths: string[] };
  return { fetch, streams, transport, bodyOf };
}

const sample = (path: string, payload: string) =>
  `event: sample\ndata: ${JSON.stringify({ path, channel: 'measured', receivedAt: 5, payload })}\n\n`;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the signals gateway transport', () => {
  it('opens one stream for every path a page subscribes to as it renders', async () => {
    const { fetch, transport, bodyOf } = gateway();

    transport.subscribe(['a'], jest.fn());
    transport.subscribe(['b', 'c'], jest.fn());
    transport.subscribe(['a'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://signals.example/stream');
    expect(bodyOf(0).paths).toEqual(['a', 'b', 'c']);
  });

  it('sends the token in the header and never in the address', async () => {
    const { fetch, transport } = gateway();

    transport.subscribe(['a'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    const [url, init] = fetch.mock.calls[0];
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
    expect(url).not.toContain(TOKEN);
    expect(init.body).not.toContain(TOKEN);
  });

  it('opens the stream again when the set of paths changes, and not otherwise', async () => {
    const { fetch, transport, bodyOf } = gateway();
    const stopA = transport.subscribe(['a'], jest.fn());
    const stopShared = transport.subscribe(['b'], jest.fn());
    const stopSecond = transport.subscribe(['b'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    stopSecond();
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(1);

    stopA();
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(bodyOf(1).paths).toEqual(['b']);

    stopShared();
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((fetch.mock.calls[1][1].signal as AbortSignal).aborted).toBe(true);
  });

  it('hands each sample to the sinks of its path', async () => {
    const { streams, transport } = gateway();
    const sink = jest.fn();
    const other = jest.fn();
    transport.subscribe(['room/temp'], sink);
    transport.subscribe(['room/co2'], other);
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    streams[0].send(sample('room/temp', '21.5'));
    streams[0].send(sample('room/temp', 'not a reading'));
    streams[0].send('event: sample\ndata: not json\n\n');
    await jest.advanceTimersByTimeAsync(0);

    expect(other).not.toHaveBeenCalled();
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({
      signalPath: 'room/temp',
      channel: 'measured',
      ts: 5,
      value: 21.5,
    });
  });

  it('reads its state from the gateway, and down when the stream fails', async () => {
    const { fetch, streams, transport } = gateway();
    const listener = jest.fn();
    transport.onState(listener);
    transport.subscribe(['a'], jest.fn());
    expect(transport.state()).toBe('connecting');
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    streams[0].send('event: state\ndata: {"state":"live"}\n\n');
    await jest.advanceTimersByTimeAsync(0);
    expect(transport.state()).toBe('live');

    streams[0].send('event: state\ndata: {"state":"asleep"}\n\n');
    await jest.advanceTimersByTimeAsync(0);
    expect(transport.state()).toBe('live');

    fetch.mockRejectedValueOnce(new Error('offline'));
    streams[0].end();
    await jest.advanceTimersByTimeAsync(0);
    expect(transport.state()).toBe('down');
    await jest.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);
    expect(transport.state()).toBe('down');
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('reconnects five seconds after the stream ends, or after the retry asked for', async () => {
    const { fetch, streams, transport } = gateway();
    transport.subscribe(['a'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    streams[0].end();
    await jest.advanceTimersByTimeAsync(RECONNECT_DELAY_MS - 1);
    expect(fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);

    streams[1].send('retry: 1000\n\n');
    streams[1].end();
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('stops asking for paths the gateway refused, until they are dropped', async () => {
    const { fetch, streams, transport, bodyOf } = gateway();
    const stopSecret = transport.subscribe(['secret'], jest.fn());
    transport.subscribe(['a'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    streams[0].send('event: refused\ndata: {"paths":["secret"]}\n\n');
    streams[0].end();
    await jest.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);
    expect(bodyOf(1).paths).toEqual(['a']);

    stopSecret();
    transport.subscribe(['secret'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    expect(bodyOf(fetch.mock.calls.length - 1).paths).toEqual(['a', 'secret']);
  });

  it('closes its stream and opens no other', async () => {
    const { fetch, transport } = gateway();
    transport.subscribe(['a'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    transport.close();
    const signal = fetch.mock.calls[0][1].signal as AbortSignal;
    await jest.advanceTimersByTimeAsync(RECONNECT_DELAY_MS);

    expect(signal.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
