/**
 * Where the signals gateway is and how a request proves who sends it.
 *
 * The gateway reads the broker and the time-series database on the server,
 * so the browser holds no broker login. It accepts the user's GitLab access
 * token as a bearer token. The token goes only in the `Authorization` header,
 * never in an address, because addresses end up in server and proxy logs.
 */

import type { FetchLike } from 'viz/sseStream';

export interface GatewaySettings {
  /** The gateway's address, `REACT_APP_VIZ_SIGNALS_URL` in `env.js`. */
  readonly url: string;
  /** The signed-in user's access token, read at each request. */
  readonly token: () => string;
  readonly fetch?: FetchLike;
}

/** The address of one endpoint of the gateway. */
export function endpoint(settings: GatewaySettings, name: string): string {
  const base = settings.url.endsWith('/')
    ? settings.url.slice(0, -1)
    : settings.url;
  return `${base}/${name}`;
}

export function authorization(
  settings: GatewaySettings,
): Record<string, string> {
  return { Authorization: `Bearer ${settings.token()}` };
}
