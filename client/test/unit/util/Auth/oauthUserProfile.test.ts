import {
  resolveOAuthProfileUrl,
  resolveOAuthUsername,
} from 'util/auth/oauthUserProfile';

describe('oauthUserProfile', () => {
  describe('resolveOAuthUsername', () => {
    it('resolves username from preferred_username for keycloak profiles', () => {
      expect(
        resolveOAuthUsername({
          preferred_username: 'kc-user',
          sub: 'uuid-123',
        }),
      ).toBe('kc-user');
    });

    it('resolves username from profile URL for gitlab profiles', () => {
      expect(
        resolveOAuthUsername({
          profile: 'https://gitlab.example.com/group/gitlab-user',
        }),
      ).toBe('gitlab-user');
    });

    it('resolves username from the username claim', () => {
      expect(resolveOAuthUsername({ username: 'plain-user' })).toBe(
        'plain-user',
      );
    });

    it('resolves username from the nickname claim', () => {
      expect(resolveOAuthUsername({ nickname: 'nick' })).toBe('nick');
    });

    it('resolves username from the login claim for github profiles', () => {
      expect(resolveOAuthUsername({ login: 'gh-login' })).toBe('gh-login');
    });

    it('resolves username from email local part for dex profiles', () => {
      expect(
        resolveOAuthUsername({
          email: 'dex-user@example.com',
        }),
      ).toBe('dex-user');
    });

    it('resolves username from upn local part for azure profiles', () => {
      expect(
        resolveOAuthUsername({
          upn: 'azure-user@corp.example.com',
        }),
      ).toBe('azure-user');
    });

    it('falls back to sub claim when no other claim is available', () => {
      expect(
        resolveOAuthUsername({
          sub: 'subject-only',
        }),
      ).toBe('subject-only');
    });

    it('returns empty string when no usable claims are available', () => {
      expect(resolveOAuthUsername({})).toBe('');
    });

    it('returns empty string for null profile', () => {
      expect(resolveOAuthUsername(null)).toBe('');
    });

    it('returns empty string for undefined profile', () => {
      expect(resolveOAuthUsername(undefined)).toBe('');
    });

    it('returns empty string when profile URL has no path segments (bare domain)', () => {
      expect(
        resolveOAuthUsername({ profile: 'https://idp.example.com/' }),
      ).toBe('');
    });

    it('returns empty string when profile claim is not a valid URL and contains no path separator', () => {
      expect(resolveOAuthUsername({ profile: 'not-a-valid-url' })).toBe('');
    });

    it('resolves username from relative profile path', () => {
      expect(resolveOAuthUsername({ profile: 'example/username' })).toBe(
        'username',
      );
    });

    it('resolves username from a profile URL with a trailing slash', () => {
      expect(
        resolveOAuthUsername({
          profile: 'https://gitlab.example.com/group/gitlab-user/',
        }),
      ).toBe('gitlab-user');
    });

    it('skips a claim containing URL path separators and falls through', () => {
      expect(
        resolveOAuthUsername({
          preferred_username: 'malicious/../path',
          sub: 'safe-sub',
        }),
      ).toBe('safe-sub');
    });

    it('skips a claim that is a path traversal sequence', () => {
      expect(
        resolveOAuthUsername({
          preferred_username: '..',
          sub: 'safe-sub',
        }),
      ).toBe('safe-sub');
    });

    it('returns empty string when the only claim is path-unsafe', () => {
      expect(resolveOAuthUsername({ preferred_username: 'a/b' })).toBe('');
    });
  });

  describe('resolveOAuthProfileUrl', () => {
    it('resolves profile claim when present', () => {
      expect(
        resolveOAuthProfileUrl({
          profile: 'https://idp.example.com/account',
          html_url: 'https://github.com/user',
        }),
      ).toBe('https://idp.example.com/account');
    });

    it('falls back to html_url when profile is absent', () => {
      expect(
        resolveOAuthProfileUrl({
          html_url: 'https://github.com/user',
        }),
      ).toBe('https://github.com/user');
    });

    it('returns undefined when no profile URL is exposed', () => {
      expect(resolveOAuthProfileUrl({})).toBeUndefined();
    });

    it('returns undefined for unsafe URL schemes', () => {
      expect(
        resolveOAuthProfileUrl({
          profile: 'data:text/plain;base64,Zm9v',
        }),
      ).toBeUndefined();
    });

    it('returns undefined for malformed URLs', () => {
      expect(
        resolveOAuthProfileUrl({
          profile: 'not-a-valid-url',
        }),
      ).toBeUndefined();
    });
  });
});
