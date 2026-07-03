import { LogEvent, LogEventType, createLogEvent } from 'util/logger/logEvent';
import { hashUsername } from 'util/logger/hashUtils';
import { getSessionId } from 'util/logger/sessionManager';
import { logToConsole } from 'util/logger/consoleLogger';
import { sendBeacon } from 'util/logger/beaconLogger';
import { addLog } from 'util/logger/indexedDBLogger';

let userHash = '';
let sessionId = '';
let loggerUrl = '';
let initialized = false;
let lastNavigationPage = '';

export interface LogInput {
  readonly event: LogEventType;
  readonly page: string;
  readonly element: string;
  readonly label: string;
  readonly context?: Record<string, string>;
}

export async function initLogger(username: string): Promise<void> {
  sessionId = getSessionId();
  userHash = await hashUsername(username);
  loggerUrl = window.env?.LOGGER_URL ?? '';
  initialized = true;
}

export function isLoggerInitialized(): boolean {
  return initialized;
}

export function log({
  event,
  page,
  element,
  label,
  context = {},
}: LogInput): LogEvent | null {
  if (!initialized) return null;

  const logEvent = createLogEvent({
    sessionId,
    userHash,
    event,
    page,
    element,
    label,
    context,
  });
  logToConsole(logEvent);
  addLog(logEvent).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('Logger: failed to persist event to IndexedDB', err);
  });
  if (loggerUrl) {
    sendBeacon(loggerUrl, logEvent);
  }
  return logEvent;
}

export function logNavigation(page: string): LogEvent | null {
  if (page === lastNavigationPage) return null;

  const logEvent = log({
    event: 'navigation',
    page,
    element: 'page',
    label: page,
  });
  if (logEvent) {
    lastNavigationPage = page;
  }
  return logEvent;
}

export function resetLogger(): void {
  userHash = '';
  sessionId = '';
  loggerUrl = '';
  initialized = false;
  lastNavigationPage = '';
}
