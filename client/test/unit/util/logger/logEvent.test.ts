import { createLogEvent } from 'util/logger/logEvent';

describe('logEvent', () => {
  it('creates a log event with all fields', () => {
    const event = createLogEvent(
      'session-123',
      'hash-abc',
      '/library',
      'tab',
      'Functions',
      { subtab: 'private' },
    );

    expect(event.sessionId).toBe('session-123');
    expect(event.userHash).toBe('hash-abc');
    expect(event.event).toBe('click');
    expect(event.page).toBe('/library');
    expect(event.element).toBe('tab');
    expect(event.label).toBe('Functions');
    expect(event.context).toEqual({ subtab: 'private' });
    expect(event.timestamp).toBeDefined();
  });

  it('defaults context to empty object', () => {
    const event = createLogEvent(
      'session-123',
      'hash-abc',
      '/library',
      'tab',
      'Functions',
    );

    expect(event.context).toEqual({});
  });

  it('produces a valid ISO timestamp', () => {
    const event = createLogEvent('s', 'h', '/', 'btn', 'X');
    const parsed = Date.parse(event.timestamp);
    expect(Number.isNaN(parsed)).toBe(false);
  });
});
