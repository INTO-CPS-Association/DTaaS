import { webcrypto } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  initLogger,
  log,
  logNavigation,
  resetLogger,
  isLoggerInitialized,
} from 'util/logger/logger';
import * as beaconLogger from 'util/logger/beaconLogger';
import * as indexedDBLogger from 'util/logger/indexedDBLogger';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
  });
});

jest.mock('util/logger/beaconLogger', () => ({
  sendBeacon: jest.fn(),
}));

jest.mock('util/logger/indexedDBLogger', () => ({
  addLog: jest.fn().mockResolvedValue(undefined),
  getAllLogs: jest.fn().mockResolvedValue([]),
  clearLogs: jest.fn().mockResolvedValue(undefined),
}));

describe('logger', () => {
  beforeEach(() => {
    resetLogger();
    sessionStorage.clear();
    jest.clearAllMocks();
    (uuidv4 as jest.Mock).mockReturnValue('test-uuid-1234');
    (indexedDBLogger.addLog as jest.Mock).mockResolvedValue(undefined);
  });

  it('is not initialized by default', () => {
    expect(isLoggerInitialized()).toBe(false);
  });

  it('initializes with a username', async () => {
    await initLogger('testuser');
    expect(isLoggerInitialized()).toBe(true);
  });

  it('returns null when logging before init', () => {
    const result = log({
      event: 'click',
      page: '/page',
      element: 'btn',
      label: 'Click',
    });
    expect(result).toBeNull();
  });

  it('logs an event after initialization', async () => {
    await initLogger('testuser');
    const event = log({
      event: 'click',
      page: '/library',
      element: 'tab',
      label: 'Functions',
      context: { subtab: 'private' },
    });

    expect(event).not.toBeNull();
    expect(event!.event).toBe('click');
    expect(event!.page).toBe('/library');
    expect(event!.element).toBe('tab');
    expect(event!.label).toBe('Functions');
    expect(event!.userHash).toHaveLength(64);
    expect(event!.sessionId).toBeDefined();
  });

  it('persists log event to IndexedDB', async () => {
    await initLogger('testuser');
    const event = log({
      event: 'click',
      page: '/library',
      element: 'tab',
      label: 'Data',
    });

    expect(indexedDBLogger.addLog).toHaveBeenCalledWith(event);
  });

  it('sends beacon when logger URL is configured', async () => {
    const origEnv = globalThis.env;
    globalThis.env = {
      ...globalThis.env,
      LOGGER_URL: 'https://example.com/logger',
    };

    await initLogger('testuser');
    const event = log({
      event: 'change',
      page: '/library',
      element: 'tab',
      label: 'Data',
    });

    expect(beaconLogger.sendBeacon).toHaveBeenCalledWith(
      'https://example.com/logger',
      event,
    );

    globalThis.env = origEnv;
  });

  it('does not send beacon when logger URL is empty', async () => {
    await initLogger('testuser');
    log({ event: 'click', page: '/library', element: 'tab', label: 'Data' });
    expect(beaconLogger.sendBeacon).not.toHaveBeenCalled();
  });

  it('resets the logger state', async () => {
    await initLogger('testuser');
    resetLogger();
    expect(isLoggerInitialized()).toBe(false);
  });

  it('returns null when logging navigation before init', () => {
    expect(logNavigation('/library')).toBeNull();
  });

  it('logs a navigation event after initialization', async () => {
    await initLogger('testuser');
    const event = logNavigation('/library');

    expect(event).not.toBeNull();
    expect(event!.event).toBe('navigation');
    expect(event!.page).toBe('/library');
    expect(event!.element).toBe('page');
    expect(event!.label).toBe('/library');
  });

  it('skips consecutive navigation events for the same page', async () => {
    await initLogger('testuser');

    expect(logNavigation('/library')).not.toBeNull();
    expect(logNavigation('/library')).toBeNull();
    expect(logNavigation('/digitaltwins')).not.toBeNull();
    expect(logNavigation('/library')).not.toBeNull();
  });

  it('clears the last navigation page on reset', async () => {
    await initLogger('testuser');
    logNavigation('/library');

    resetLogger();
    await initLogger('testuser');

    expect(logNavigation('/library')).not.toBeNull();
  });
});
