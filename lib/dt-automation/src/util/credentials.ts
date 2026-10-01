/**
 * The GitLab credentials, held in memory instead of in `sessionStorage`.
 *
 * Anything on the consuming application's origin can read shared storage,
 * including script inside same-origin iframes the application embeds. A
 * module variable is not shared that way: each browsing context gets its own
 * copy, so an embedded page reads its own empty variable. The username is not
 * a secret, but it is injected the same way so the package depends on no
 * storage key the application happens to write.
 *
 * The application sets both once sign-in completes, again whenever the token
 * is renewed, and before any page that uses the package fetches after a
 * reload. It clears both on sign-out.
 */

let accessToken = '';
let username = '';

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

export function setUsername(name: string): void {
  username = name;
}

/** The signed-in GitLab username, or an empty string before sign-in. */
export function getUsername(): string {
  return username;
}

export function clearUsername(): void {
  username = '';
}
