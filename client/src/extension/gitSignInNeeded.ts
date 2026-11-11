/**
 * GitLab refused the token, most often because the session ended. Signing in
 * again gives a new token, so a page can say that instead of a plain error.
 */
export default class GitSignInNeeded extends Error {
  constructor(repo: string) {
    super(`GitLab refused the token for ${repo}`);
    this.name = 'GitSignInNeeded';
  }
}
