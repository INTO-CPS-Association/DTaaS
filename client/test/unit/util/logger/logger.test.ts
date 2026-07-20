import { webcrypto } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  initLogger,
  log,
  logDismiss,
  logNavigation,
  resetLogger,
  isLoggerInitialized,
  setLoggerStore,
  resetLoggerStore,
} from 'util/logger/logger';
import {
  MAX_LOG_CONTEXT_DEPTH,
  MAX_LOG_CONTEXT_ENTRIES,
} from 'util/logger/contextUtils';
import type { LogContext } from 'util/logger/logEvent';
import {
  resetSettingsStore,
  setSettingsStore,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { DEFAULT_SETTINGS } from 'store/settings.slice';
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
  const showSnackbar = jest.fn();

  beforeEach(() => {
    resetLogger();
    sessionStorage.clear();
    jest.clearAllMocks();
    (uuidv4 as jest.Mock).mockReturnValue('test-uuid-1234');
    (indexedDBLogger.addLog as jest.Mock).mockResolvedValue(undefined);
    setSettingsStore({
      getState: () => ({
        settings: { ...DEFAULT_SETTINGS, loggingEnabled: true },
      }),
    });
    setLoggerStore({ showSnackbar });
  });

  afterEach(() => {
    setSettingsStore({
      getState: () => ({ settings: { ...DEFAULT_SETTINGS } }),
    });
    resetLoggerStore();
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

  it('returns null instead of throwing when settings store is not wired', async () => {
    resetSettingsStore();
    await initLogger('testuser');

    const input = {
      event: 'click' as const,
      page: '/library',
      element: 'tab',
      label: 'Data',
    };

    expect(() => log(input)).not.toThrow();
    expect(log(input)).toBeNull();
    expect(indexedDBLogger.addLog).not.toHaveBeenCalled();
    expect(beaconLogger.sendBeacon).not.toHaveBeenCalled();
  });

  it('keeps nested context values and arrays in log events', async () => {
    await initLogger('testuser');
    const event = log({
      event: 'click',
      page: '/preview/digitaltwins',
      element: 'button',
      label: 'Start',
      context: {
        dt: {
          name: 'mass-spring-damper',
          button: 'start',
          history: ['2026-07-07T12:30:00.000Z'],
        },
      },
    });

    expect(event!.context).toEqual({
      dt: {
        name: 'mass-spring-damper',
        button: 'start',
        history: ['2026-07-07T12:30:00.000Z'],
      },
    });
  });

  it('bounds deep and wide context before logging', async () => {
    const wideContext = Object.fromEntries(
      Array.from({ length: MAX_LOG_CONTEXT_ENTRIES + 5 }, (_, index) => [
        `key${index}`,
        index,
      ]),
    );
    let deepContext: LogContext = { value: 'hidden' };
    for (let index = 0; index < MAX_LOG_CONTEXT_DEPTH + 3; index += 1) {
      deepContext = { child: deepContext };
    }

    await initLogger('testuser');
    const wideEvent = log({
      event: 'click',
      page: '/library',
      element: 'button',
      label: 'Wide',
      context: wideContext,
    });
    const deepEvent = log({
      event: 'click',
      page: '/library',
      element: 'button',
      label: 'Deep',
      context: deepContext,
    });

    expect(Object.keys(wideEvent!.context)).toHaveLength(
      MAX_LOG_CONTEXT_ENTRIES,
    );
    expect(JSON.stringify(deepEvent!.context)).toContain(
      '[context depth limit reached]',
    );
    expect(JSON.stringify(deepEvent!.context)).not.toContain('hidden');
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

  it('shows a snackbar when persisting the event to IndexedDB fails', async () => {
    (indexedDBLogger.addLog as jest.Mock).mockRejectedValue(
      new Error('quota exceeded'),
    );

    await initLogger('testuser');
    log({ event: 'click', page: '/library', element: 'tab', label: 'Data' });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(showSnackbar).toHaveBeenCalledWith(
      'Logging has stopped working for this session.',
      'warning',
    );
  });

  it('only shows the persistence-failure snackbar once per session', async () => {
    (indexedDBLogger.addLog as jest.Mock).mockRejectedValue(
      new Error('quota exceeded'),
    );

    await initLogger('testuser');
    log({ event: 'click', page: '/library', element: 'tab', label: 'One' });
    log({ event: 'click', page: '/library', element: 'tab', label: 'Two' });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(showSnackbar).toHaveBeenCalledTimes(1);
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

  it('trims logger URL before sending beacon', async () => {
    const origEnv = globalThis.env;
    globalThis.env = {
      ...globalThis.env,
      LOGGER_URL: '  https://example.com/logger  ',
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

  it('does not send beacon when logger URL is blank', async () => {
    const origEnv = globalThis.env;
    globalThis.env = {
      ...globalThis.env,
      LOGGER_URL: '   ',
    };

    await initLogger('testuser');
    log({ event: 'click', page: '/library', element: 'tab', label: 'Data' });
    expect(beaconLogger.sendBeacon).not.toHaveBeenCalled();

    globalThis.env = origEnv;
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

  it('adds page transition data between navigation events', async () => {
    await initLogger('testuser');
    expect(logNavigation('/workbench')!.page_transition).toBeUndefined();

    const event = logNavigation('/preview/digitaltwins');

    expect(event!.page_transition).toEqual({
      src: '/workbench',
      target: '/preview/digitaltwins',
    });
  });

  it('skips consecutive navigation events for the same page', async () => {
    await initLogger('testuser');

    expect(logNavigation('/library')).not.toBeNull();
    expect(logNavigation('/library')).toBeNull();
    expect(logNavigation('/digitaltwins')).not.toBeNull();
    expect(logNavigation('/library')).not.toBeNull();
  });

  it('returns null when logging a dismissal before init', () => {
    expect(
      logDismiss({ element: 'dialog', label: 'Confirm Clear' }),
    ).toBeNull();
  });

  it('logs a dismiss event with the dismissal reason', async () => {
    await initLogger('testuser');
    const event = logDismiss({
      element: 'dialog',
      label: 'Confirm Clear',
      reason: 'backdropClick',
    });

    expect(event).not.toBeNull();
    expect(event!.event).toBe('dismiss');
    expect(event!.element).toBe('dialog');
    expect(event!.label).toBe('Confirm Clear');
    expect(event!.context).toEqual({ reason: 'backdropClick' });
  });

  it('logs a dismiss event without a reason', async () => {
    await initLogger('testuser');
    const event = logDismiss({ element: 'snackbar', label: 'Saved settings' });

    expect(event).not.toBeNull();
    expect(event!.event).toBe('dismiss');
    expect(event!.element).toBe('snackbar');
    expect(event!.context).toEqual({});
  });

  it('does not log, navigate, or dismiss when logging is disabled after init', async () => {
    await initLogger('testuser');
    setSettingsStore({
      getState: () => ({
        settings: { ...DEFAULT_SETTINGS, loggingEnabled: false },
      }),
    });

    expect(
      log({ event: 'click', page: '/library', element: 'tab', label: 'Data' }),
    ).toBeNull();
    expect(logNavigation('/library')).toBeNull();
    expect(
      logDismiss({ element: 'dialog', label: 'Confirm Clear' }),
    ).toBeNull();
    expect(isLoggerInitialized()).toBe(true);
  });

  it('clears the last navigation page on reset', async () => {
    await initLogger('testuser');
    logNavigation('/library');

    resetLogger();
    await initLogger('testuser');

    expect(logNavigation('/library')).not.toBeNull();
  });
});
