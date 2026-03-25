import { LogEvent, createLogEvent } from 'util/logger/logEvent';
import { hashUsername } from 'util/logger/hashUtils';
import { getSessionId } from 'util/logger/sessionManager';
import { logToConsole } from 'util/logger/consoleLogger';
import { sendBeacon } from 'util/logger/beaconLogger';
import { addLog } from 'util/logger/indexedDBLogger';

let userHash = '';
let sessionId = '';
let loggerUrl = '';
let initialized = false;

export async function initLogger(username: string): Promise<void> {
  sessionId = getSessionId();
  userHash = await hashUsername(username);
  loggerUrl = window.env?.LOGGER_URL ?? '';
  initialized = true;
}

export function isLoggerInitialized(): boolean {
  return initialized;
}

export function log(
  page: string,
  element: string,
  label: string,
  context: Record<string, string> = {},
): LogEvent | null {
  if (!initialized) return null;

  const event = createLogEvent(
    sessionId,
    userHash,
    page,
    element,
    label,
    context,
  );
  logToConsole(event);
  addLog(event).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('Logger: failed to persist event to IndexedDB', err);
  });
  if (loggerUrl) {
    sendBeacon(loggerUrl, event);
  }
  return event;
}

export function resetLogger(): void {
  userHash = '';
  sessionId = '';
  loggerUrl = '';
  initialized = false;
}
