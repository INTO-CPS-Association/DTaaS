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
import type { LogEventType } from 'util/logger/logEvent';
import type { LogInput } from 'util/logger/logger';
import { sanitizeLogContext } from 'util/logger/contextUtils';

const LOGGED_EVENT_TYPES: readonly LogEventType[] = ['click', 'change'];

function findLoggerElement(target: EventTarget | null): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== document.documentElement) {
    if (el.dataset?.loggerElement) return el;
    el = el.parentElement;
  }
  return null;
}

function parseContext(raw: string | undefined) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeLogContext(parsed);
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
  initRef.current = true;
  initLogger(username)
    .then(() => {
      onReady();
    })
    .catch(() => {
      initRef.current = false;
    });
}

function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function getInputChangedValue(input: HTMLInputElement): string | null {
  if (input.type === 'password') return null;
  if (input.type === 'checkbox' || input.type === 'radio') {
    return String(input.checked);
  }
  return input.value;
}

type ControlExtractor = {
  matches: (target: EventTarget) => boolean;
  read: (target: EventTarget) => string | null;
};

const controlExtractors: ControlExtractor[] = [
  {
    matches: (target) => target instanceof HTMLInputElement,
    read: (target) => getInputChangedValue(target as HTMLInputElement),
  },
  {
    matches: (target) =>
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement,
    read: (target) => (target as HTMLTextAreaElement | HTMLSelectElement).value,
  },
];

function getControlChangedValue(target: EventTarget | null): string | null {
  const extractor = target
    ? controlExtractors.find(({ matches }) => matches(target))
    : undefined;
  return extractor && target ? extractor.read(target) : null;
}

function getChangedValue(
  el: HTMLElement,
  target: EventTarget | null,
): string | null {
  // Value capture is opt-in: tagged fields explicitly request it.
  return el.dataset.loggerCaptureValue === 'true'
    ? getControlChangedValue(target)
    : null;
}

function findEligibleLoggerElement(event: Event): HTMLElement | null {
  if (!isLoggerInitialized()) return null;
  if (event.type === 'click' && isFormControl(event.target)) return null;
  return findLoggerElement(event.target);
}

function createDomEventPayload(event: Event, el: HTMLElement): LogInput {
  const element = el.dataset.loggerElement ?? '';
  const label = el.dataset.loggerLabel ?? el.textContent?.trim() ?? '';
  const context = parseContext(el.dataset.loggerContext);
  const page = globalThis.location.pathname;

  if (event.type === 'change') {
    const value = getChangedValue(el, event.target);
    if (value !== null) context.value = value;
  }

  return { event: event.type as LogEventType, page, element, label, context };
}

function buildDomEventPayload(event: Event): LogInput | null {
  const el = findEligibleLoggerElement(event);
  return el ? createDomEventPayload(event, el) : null;
}

function logDomEvent(event: Event): void {
  const payload = buildDomEventPayload(event);
  if (payload) log(payload);
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

function useLoggerReady(loggingEnabled: boolean, username: string): boolean {
  const initRef = useRef(false);
  const [ready, setReady] = useState(isLoggerInitialized());

  // Deliberately no dependency array: the username can arrive on any later
  // render, and a failed init (initRef reset) retries the same way.
  useEffect(() => {
    if (!loggingEnabled) return;
    startLogger(username, initRef, () => setReady(true));
  });

  return ready;
}

function useLoggerNavigation(loggingEnabled: boolean, ready: boolean): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (loggingEnabled && ready) logNavigation(pathname);
  }, [loggingEnabled, ready, pathname]);
}

function useLoggerDomEvents(loggingEnabled: boolean): void {
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

// eslint-disable-next-line import/prefer-default-export
export function useLogger(): void {
  const stateUsername = useSelector((state: RootState) => state.auth.userName);
  const loggingEnabled = useSelector(
    (state: RootState) => state.settings.loggingEnabled,
  );
  const username = getLoggerUsername(stateUsername);

  const ready = useLoggerReady(loggingEnabled, username);
  useLoggerNavigation(loggingEnabled, ready);
  useLoggerDomEvents(loggingEnabled);
}
