import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from 'util/auth/accessToken';

/**
 * Tests for where the access token is held.
 *
 * It used to live in `sessionStorage`, which anything on this origin can
 * read, including script inside the same-origin iframes the library and
 * digital twin pages embed. The point of this module is that it cannot be
 * read that way, and the last test is the one that says so.
 */

describe('the access token', () => {
  afterEach(() => {
    clearAccessToken();
  });

  it('is empty before anybody signs in', () => {
    expect(getAccessToken()).toBe('');
  });

  it('is what was last set', () => {
    setAccessToken('first');
    setAccessToken('second');

    expect(getAccessToken()).toBe('second');
  });

  it('is empty again after signing out', () => {
    // Sign-out calls this beside the sessionStorage it accompanies. A token
    // left behind would be handed to the next session's first request.
    setAccessToken('a-token');
    clearAccessToken();

    expect(getAccessToken()).toBe('');
  });

  it('is not written to sessionStorage by this module', () => {
    // The defect this module exists to close. Reading the whole of
    // sessionStorage instead of one key, so a rename cannot hide a
    // reintroduction.
    //
    // This covers this module only. The OIDC user store writes the same token
    // under oidc.user:{authority}:{client_id} and no test here sees it.
    setAccessToken('a-token');

    const stored = Object.keys(sessionStorage).map((k) =>
      sessionStorage.getItem(k),
    );
    expect(stored).not.toContain('a-token');
  });
});
