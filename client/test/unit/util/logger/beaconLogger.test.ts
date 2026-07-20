import { sendBeacon } from 'util/logger/beaconLogger';
import { LogEvent } from 'util/logger/logEvent';

const mockEvent: LogEvent = {
  sessionId: 'sess-1',
  userHash: 'hash-1',
  timestamp: '2026-03-24T20:00:00.000Z',
  event: 'click',
  page: '/library',
  element: 'tab',
  label: 'Functions',
  context: {},
};

describe('beaconLogger', () => {
  const originalSendBeacon = navigator.sendBeacon;

  beforeEach(() => {
    navigator.sendBeacon = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    navigator.sendBeacon = originalSendBeacon;
  });

  it('sends a beacon with JSON payload', () => {
    const result = sendBeacon('https://example.com/logger', mockEvent);
    expect(result).toBe(true);
    expect(navigator.sendBeacon).toHaveBeenCalledWith(
      'https://example.com/logger',
      expect.any(Blob),
    );
  });

  it('returns false when loggerUrl is empty', () => {
    const result = sendBeacon('', mockEvent);
    expect(result).toBe(false);
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('returns false when loggerUrl is blank', () => {
    const result = sendBeacon('   ', mockEvent);
    expect(result).toBe(false);
    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('returns false when sendBeacon is not available', () => {
    const saved = navigator.sendBeacon;
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      configurable: true,
    });
    const result = sendBeacon('https://example.com/logger', mockEvent);
    expect(result).toBe(false);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: saved,
      configurable: true,
    });
  });
});
