/**
 * The GitLab access token, held in memory instead of in `sessionStorage`.
 *
 * Anything on the consuming application's origin can read shared storage,
 * including script inside same-origin iframes the application embeds. A
 * module variable is not shared that way: each browsing context gets its own
 * copy, so an embedded page reads its own empty variable.
 *
 * The application calls `setAccessToken` once sign-in completes and again
 * whenever the token is renewed, and `clearAccessToken` on sign-out.
 */

let accessToken = '';

export function setAccessToken(token: string): void {
  accessToken = token;
}

/** The current token, or an empty string before sign-in completes. */
export function getAccessToken(): string {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = '';
}
