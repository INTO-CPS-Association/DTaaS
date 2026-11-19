/**
 * The GitLab credentials of the signed-in user, held by the client core.
 *
 * They live in memory instead of in `sessionStorage`. Anything on this origin
 * can read shared storage, including script inside the same-origin iframes the
 * library and digital twin pages embed. A module variable is not shared that
 * way: each browsing context gets its own copy, so an embedded page reads its
 * own empty variable. The username is not a secret, but it is kept the same
 * way so both travel together.
 *
 * The private route sets both during render once sign-in completes, again
 * whenever the token is renewed and after a reload. Sign-out clears both.
 *
 * The automation package keeps its own copy, which every setter here also
 * writes. That push is the only place the core reaches into automation and it
 * goes away once automation is an extension that asks the host for the token.
 */

import {
  clearAccessToken as clearAutomationToken,
  clearUsername as clearAutomationUsername,
  setAccessToken as setAutomationToken,
  setUsername as setAutomationUsername,
} from '@into-cps-association/dt-automation';

let accessToken = '';
let username = '';

export function setAccessToken(token: string): void {
  accessToken = token;
  setAutomationToken(token);
}

/** The current token, or an empty string before sign-in completes. */
export function getAccessToken(): string {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = '';
  clearAutomationToken();
}

export function setUsername(name: string): void {
  username = name;
  setAutomationUsername(name);
}

/** The signed-in GitLab username, or an empty string before sign-in. */
export function getUsername(): string {
  return username;
}

export function clearUsername(): void {
  username = '';
  clearAutomationUsername();
}
