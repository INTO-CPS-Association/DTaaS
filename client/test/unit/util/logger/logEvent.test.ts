import { createLogEvent } from 'util/logger/logEvent';

describe('logEvent', () => {
  it('creates a log event with all fields', () => {
    const event = createLogEvent({
      sessionId: 'session-123',
      userHash: 'hash-abc',
      event: 'click',
      page: '/library',
      element: 'tab',
      label: 'Functions',
      context: { subtab: 'private' },
    });

    expect(event.sessionId).toBe('session-123');
    expect(event.userHash).toBe('hash-abc');
    expect(event.event).toBe('click');
    expect(event.page).toBe('/library');
    expect(event.element).toBe('tab');
    expect(event.label).toBe('Functions');
    expect(event.context).toEqual({ subtab: 'private' });
    expect(event.timestamp).toBeDefined();
  });

  it('passes through the event type', () => {
    const event = createLogEvent({
      sessionId: 'session-123',
      userHash: 'hash-abc',
      event: 'change',
      page: '/insights/log',
      element: 'input',
      label: 'Log filter',
    });

    expect(event.event).toBe('change');
  });

  it('defaults context to empty object', () => {
    const event = createLogEvent({
      sessionId: 'session-123',
      userHash: 'hash-abc',
      event: 'click',
      page: '/library',
      element: 'tab',
      label: 'Functions',
    });

    expect(event.context).toEqual({});
  });

  it('produces a valid ISO timestamp', () => {
    const event = createLogEvent({
      sessionId: 's',
      userHash: 'h',
      event: 'click',
      page: '/',
      element: 'btn',
      label: 'X',
    });
    const parsed = Date.parse(event.timestamp);
    expect(Number.isNaN(parsed)).toBe(false);
  });
});
