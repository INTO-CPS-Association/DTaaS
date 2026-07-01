import { LogEvent } from 'util/logger/logEvent';

// eslint-disable-next-line import/prefer-default-export
export function sendBeacon(loggerUrl: string, event: LogEvent): boolean {
  if (!loggerUrl || typeof navigator.sendBeacon !== 'function') {
    return false;
  }
  const blob = new Blob([JSON.stringify(event)], {
    type: 'application/json',
  });
  return navigator.sendBeacon(loggerUrl, blob);
}
