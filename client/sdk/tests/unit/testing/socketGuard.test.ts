import installSocketGuard, {
  SocketBlockedError,
} from 'src/testing/socketGuard';

describe('installSocketGuard', () => {
  it('blocks and records WebSocket and EventSource connections', () => {
    const guard = installSocketGuard();
    try {
      expect(() => new WebSocket('wss://broker/ws')).toThrow(
        SocketBlockedError,
      );
      expect(() => new EventSource('https://sse')).toThrow(
        'Extension opened a socket to https://sse',
      );
      expect(guard.attempts).toEqual(['wss://broker/ws', 'https://sse']);
    } finally {
      guard.restore();
    }
  });

  it('restores the original globals', () => {
    const original = globalThis.WebSocket;
    installSocketGuard().restore();
    expect(globalThis.WebSocket).toBe(original);
    expect('EventSource' in globalThis).toBe(false);
  });

  it('stays installed until every overlapping guard is restored', () => {
    const original = globalThis.WebSocket;
    const first = installSocketGuard();
    const second = installSocketGuard();
    first.restore();
    expect(() => new WebSocket('wss://late')).toThrow(SocketBlockedError);
    expect(second.attempts).toEqual(['wss://late']);
    second.restore();
    expect(globalThis.WebSocket).toBe(original);
  });

  it('ignores a second restore of the same guard', () => {
    const original = globalThis.WebSocket;
    const first = installSocketGuard();
    const second = installSocketGuard();
    first.restore();
    first.restore();
    expect(globalThis.WebSocket).not.toBe(original);
    second.restore();
    expect(globalThis.WebSocket).toBe(original);
  });
});
