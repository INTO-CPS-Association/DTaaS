import { LogEvent } from 'util/logger/logEvent';

// eslint-disable-next-line import/prefer-default-export
export function sendBeacon(loggerUrl: string, event: LogEvent): boolean {
  if (!loggerUrl.trim() || typeof navigator.sendBeacon !== 'function') {
    return false;
  }
  // text/plain avoids a CORS preflight (application/json does not qualify as
  // a CORS-safelisted content type), so a cross-origin logger being unreachable
  // fails silently instead of surfacing a blocked-preflight console error.
  const blob = new Blob([JSON.stringify(event)], {
    type: 'text/plain;charset=UTF-8',
  });
  return navigator.sendBeacon(loggerUrl, blob);
}
