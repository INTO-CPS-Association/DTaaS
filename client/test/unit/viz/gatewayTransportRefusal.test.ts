import createGatewayTransport, {
  RECONNECT_DELAY_MS,
  REOPEN_DELAY_MS,
} from 'viz/gatewayTransport';
import { answerOf } from 'test/unit/viz/sseTestUtil';
import createGatewaySession from 'viz/gatewaySession';

const TOKEN = 'glpat-secret-token';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the signals gateway transport after a refusal', () => {
  it('stops asking with a token the gateway refused, and asks again with a new one', async () => {
    let token = 'expired';
    const fetch = jest.fn(async () => answerOf([], 401));
    const session = createGatewaySession(() => token);
    const transport = createGatewayTransport({
      url: 'https://signals.example',
      token: () => token,
      fetch,
      session,
    });

    transport.subscribe(['a'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    // A minute of an old tab: no request after the refusal.
    await jest.advanceTimersByTimeAsync(60_000);
    transport.subscribe(['b'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(transport.state()).toBe('down');
    expect(session.signInNeeded()).toBe(true);

    token = 'renewed';
    expect(session.signInNeeded()).toBe(false);
    transport.subscribe(['c'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('stops asking for paths after a 403, until the page asks for them again', async () => {
    const fetch = jest.fn(async () => answerOf([], 403));
    const transport = createGatewayTransport({
      url: 'https://signals.example',
      token: () => TOKEN,
      fetch,
    });

    const stop = transport.subscribe(['secret'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(transport.state()).toBe('down');

    stop();
    transport.subscribe(['secret'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('still tries again after a refusal that is not about the token', async () => {
    const fetch = jest.fn(async () => answerOf([], 503));
    const transport = createGatewayTransport({
      url: 'https://signals.example',
      token: () => TOKEN,
      fetch,
      session: createGatewaySession(() => TOKEN),
    });

    transport.subscribe(['a'], jest.fn());
    await jest.advanceTimersByTimeAsync(REOPEN_DELAY_MS + RECONNECT_DELAY_MS);

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
