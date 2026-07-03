import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from 'store/store';
import {
  initLogger,
  isLoggerInitialized,
  log,
  logNavigation,
} from 'util/logger/logger';
import { LogEventType } from 'util/logger/logEvent';

const LOGGED_EVENT_TYPES: readonly LogEventType[] = ['click', 'change'];

function findLoggerElement(target: EventTarget | null): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== document.documentElement) {
    if (el.dataset?.loggerElement) return el;
    el = el.parentElement;
  }
  return null;
}

function parseContext(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function getLoggerUsername(stateUsername: string | undefined): string {
  return stateUsername ?? sessionStorage.getItem('username') ?? '';
}

function startLogger(
  username: string,
  initRef: { current: boolean },
  onReady: () => void,
): void {
  if (!username || initRef.current) return;
  initLogger(username)
    .then(() => {
      initRef.current = true;
      onReady();
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('Logger: init failed, will retry on next render', err);
    });
}

function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function logDomEvent(event: Event): void {
  if (!isLoggerInitialized()) return;
  if (event.type === 'click' && isFormControl(event.target)) return;
  const el = findLoggerElement(event.target);
  if (!el) return;

  const element = el.dataset.loggerElement ?? '';
  const label = el.dataset.loggerLabel ?? el.textContent?.trim() ?? '';
  const context = parseContext(el.dataset.loggerContext);
  const page = window.location.pathname;

  log({ event: event.type as LogEventType, page, element, label, context });
}

function registerDomEventLogger(handleEvent: (event: Event) => void) {
  LOGGED_EVENT_TYPES.forEach((type) =>
    document.addEventListener(type, handleEvent, true),
  );
  return () =>
    LOGGED_EVENT_TYPES.forEach((type) =>
      document.removeEventListener(type, handleEvent, true),
    );
}

// eslint-disable-next-line import/prefer-default-export
export function useLogger(): void {
  const stateUsername = useSelector((state: RootState) => state.auth.userName);
  const loggingEnabled = useSelector(
    (state: RootState) => state.settings.loggingEnabled,
  );
  const username = getLoggerUsername(stateUsername);
  const initRef = useRef(false);
  const [ready, setReady] = useState(isLoggerInitialized());
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loggingEnabled) return;
    startLogger(username, initRef, () => setReady(true));
  }, [loggingEnabled, username]);

  useEffect(() => {
    if (loggingEnabled && ready) logNavigation(pathname);
  }, [loggingEnabled, ready, pathname]);

  const handleEvent = useCallback(
    (event: Event) => {
      if (!loggingEnabled) return;
      logDomEvent(event);
    },
    [loggingEnabled],
  );

  useEffect(() => {
    if (!loggingEnabled) return undefined;
    return registerDomEventLogger(handleEvent);
  }, [handleEvent, loggingEnabled]);
}
