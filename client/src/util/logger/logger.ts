import { AlertColor } from '@mui/material';
import { createLogEvent } from 'util/logger/logEvent';
import type {
  LogContext,
  LogEvent,
  LogEventType,
  PageTransition,
} from 'util/logger/logEvent';
import { hashUsername } from 'util/logger/hashUtils';
import { getSessionId } from 'util/logger/sessionManager';
import { sendBeacon } from 'util/logger/beaconLogger';
import { addLog } from 'util/logger/indexedDBLogger';
import {
  getLoggingEnabled,
  getRemoteLoggingEnabled,
} from '@into-cps-association/dt-automation';
import { sanitizeLogContext } from 'util/logger/contextUtils';

const PERSISTENCE_FAILURE_MESSAGE =
  'Logging has stopped working for this session.';

interface LoggerStore {
  showSnackbar: (message: string, severity: AlertColor) => void;
}

let userHash = '';
let sessionId = '';
let loggerUrl = '';
let initialized = false;
let lastNavigationPage = '';
let loggerStore: LoggerStore | null = null;
let persistenceFailureWarned = false;

export function setLoggerStore(store: LoggerStore): void {
  loggerStore = store;
}

export function resetLoggerStore(): void {
  loggerStore = null;
}

function warnPersistenceFailureOnce(): void {
  if (persistenceFailureWarned) return;
  persistenceFailureWarned = true;
  loggerStore?.showSnackbar(PERSISTENCE_FAILURE_MESSAGE, 'warning');
}

function persistLogEvent(logEvent: LogEvent): void {
  addLog(logEvent).catch(() => {
    warnPersistenceFailureOnce();
  });
}

function sendRemoteLogEvent(logEvent: LogEvent): void {
  if (!loggerUrl.trim()) return;
  sendBeacon(loggerUrl, logEvent);
}

function shouldCreateLogEvent(
  localLoggingEnabled: boolean,
  remoteLoggingEnabled: boolean,
): boolean {
  return initialized && (localLoggingEnabled || remoteLoggingEnabled);
}

function dispatchLogEvent(
  logEvent: LogEvent,
  localLoggingEnabled: boolean,
  remoteLoggingEnabled: boolean,
): void {
  if (localLoggingEnabled) persistLogEvent(logEvent);
  if (remoteLoggingEnabled) sendRemoteLogEvent(logEvent);
}

export interface LogInput {
  readonly event: LogEventType;
  readonly page: string;
  readonly pageTransition?: PageTransition;
  readonly element: string;
  readonly label: string;
  readonly context?: LogContext;
}

export async function initLogger(username: string): Promise<void> {
  sessionId = getSessionId();
  userHash = await hashUsername(username);
  loggerUrl = globalThis.env?.LOGGER_URL?.trim() ?? '';
  initialized = true;
}

export function isLoggerInitialized(): boolean {
  return initialized;
}

export function log({
  event,
  page,
  pageTransition,
  element,
  label,
  context = {},
}: LogInput): LogEvent | null {
  const localLoggingEnabled = getLoggingEnabled();
  const remoteLoggingEnabled = getRemoteLoggingEnabled();
  if (!shouldCreateLogEvent(localLoggingEnabled, remoteLoggingEnabled))
    return null;

  const logEvent = createLogEvent({
    sessionId,
    userHash,
    event,
    page,
    pageTransition,
    element,
    label,
    context: sanitizeLogContext(context),
  });
  dispatchLogEvent(logEvent, localLoggingEnabled, remoteLoggingEnabled);
  return logEvent;
}

export function logNavigation(page: string): LogEvent | null {
  if (page === lastNavigationPage) return null;
  const pageTransition = lastNavigationPage
    ? { src: lastNavigationPage, target: page }
    : undefined;

  const logEvent = log({
    event: 'navigation',
    page,
    pageTransition,
    element: 'page',
    label: page,
  });
  if (logEvent) {
    lastNavigationPage = page;
  }
  return logEvent;
}

export interface LogDismissInput {
  readonly element: string;
  readonly label: string;
  readonly reason?: string;
  readonly context?: LogContext;
}

export function logDismiss({
  element,
  label,
  reason,
  context = {},
}: LogDismissInput): LogEvent | null {
  return log({
    event: 'dismiss',
    page: globalThis.location.pathname,
    element,
    label,
    context: reason ? { ...context, reason } : context,
  });
}

export function resetLogger(): void {
  userHash = '';
  sessionId = '';
  loggerUrl = '';
  initialized = false;
  lastNavigationPage = '';
  persistenceFailureWarned = false;
}
