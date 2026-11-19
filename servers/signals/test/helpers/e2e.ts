import type { LoggerService } from '@nestjs/common';

/** Keeps every line the application logs, so a test can read them. */
export class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  log = (message: unknown) => this.lines.push(String(message));
  error = (message: unknown) => this.lines.push(String(message));
  warn = (message: unknown) => this.lines.push(String(message));
  debug = (message: unknown) => this.lines.push(String(message));
  verbose = (message: unknown) => this.lines.push(String(message));
}

/** Posts a JSON body to a route of the gateway, with a token when given. */
export function postSignals(
  base: string,
  route: string,
  token: string | undefined,
  body: unknown,
): Promise<Response> {
  return fetch(`${base}/signals/${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
}
