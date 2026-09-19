/**
 * The access token, held in memory instead of in `sessionStorage`.
 *
 * The model layer runs outside React and cannot reach the token through the
 * auth hook, which is why it used to be put in shared storage. Anything on
 * this origin reads that, including script inside the same-origin iframes the
 * library and digital twin pages embed without a `sandbox` attribute.
 *
 * A module variable is not shared that way: each browsing context gets its own
 * copy, so an embedded page reads its own empty variable. What it gives up is
 * surviving a reload, which costs nothing, because the session is restored on
 * load and the route sets the token again before anything asks for it.
 */

let accessToken = '';

/** Called by the route guard on every render, so the value is never stale. */
export function setAccessToken(token: string): void {
  accessToken = token;
}

/** The current token, or an empty string before sign-in completes. */
export function getAccessToken(): string {
  return accessToken;
}

/** Called on sign-out, beside the `sessionStorage.clear()` it accompanies. */
export function clearAccessToken(): void {
  accessToken = '';
}
