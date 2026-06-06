import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { initLogger, isLoggerInitialized, log } from 'util/logger/logger';

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

// eslint-disable-next-line import/prefer-default-export
export function useLogger(): void {
  const stateUsername = useSelector((state: RootState) => state.auth.userName);
  const username = stateUsername ?? sessionStorage.getItem('username') ?? '';
  const initRef = useRef(false);

  useEffect(() => {
    if (!username || initRef.current) return;
    initLogger(username)
      .then(() => {
        initRef.current = true;
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Logger: init failed, will retry on next render', err);
      });
  }, [username]);

  const handleClick = useCallback((event: MouseEvent) => {
    if (!isLoggerInitialized()) return;
    const el = findLoggerElement(event.target);
    if (!el) return;

    const element = el.dataset.loggerElement ?? '';
    const label = el.dataset.loggerLabel ?? el.textContent?.trim() ?? '';
    const context = parseContext(el.dataset.loggerContext);
    const page = window.location.pathname;

    log(page, element, label, context);
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [handleClick]);
}
