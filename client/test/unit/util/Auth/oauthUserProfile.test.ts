import {
  resolveOAuthPictureUrl,
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

    it('preserves resolved username casing', () => {
      expect(
        resolveOAuthUsername({
          preferred_username: 'Enok',
          sub: 'uuid-123',
        }),
      ).toBe('Enok');
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

    it('ignores an email whose local part is empty', () => {
      // A provider is free to send a malformed claim. An empty local part is
      // not a name, and falling through to the next claim is what keeps it
      // from becoming one.
      expect(resolveOAuthUsername({ email: '@example.com' })).toBe('');
      expect(
        resolveOAuthUsername({ email: ' @example.com', sub: 'subject-id' }),
      ).toBe('subject-id');
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
  describe('resolveOAuthPictureUrl', () => {
    it('resolves the picture claim, which is the one GitLab fills in', () => {
      expect(
        resolveOAuthPictureUrl({
          picture: 'https://gitlab.example.com/uploads/avatar.png',
        }),
      ).toBe('https://gitlab.example.com/uploads/avatar.png');
    });

    it('falls back to avatar_url, which other providers use for the same thing', () => {
      expect(
        resolveOAuthPictureUrl({
          avatar_url: 'https://idp.example.com/a.png',
        }),
      ).toBe('https://idp.example.com/a.png');
    });

    it('prefers picture when a provider sends both', () => {
      expect(
        resolveOAuthPictureUrl({
          picture: 'https://gitlab.example.com/a.png',
          avatar_url: 'https://idp.example.com/b.png',
        }),
      ).toBe('https://gitlab.example.com/a.png');
    });

    it('returns undefined when the provider supplies no picture', () => {
      // The ordinary case for a provider with avatars turned off. The caller
      // shows the user's initial, so this is not an error path.
      expect(resolveOAuthPictureUrl({})).toBeUndefined();
    });

    it.each([
      // The value under test is the one being rejected, so it has to appear.
      // eslint-disable-next-line no-script-url
      ['a javascript URL', 'javascript:alert(1)'],
      ['a data URL', 'data:image/svg+xml,<svg onload=alert(1)>'],
      ['a malformed URL', 'not-a-valid-url'],
    ])('rejects %s, since the provider controls this value', (_name, value) => {
      expect(resolveOAuthPictureUrl({ picture: value })).toBeUndefined();
    });

    it.each([
      ['not a string', { picture: 42 }],
      ['empty', { picture: '' }],
      ['no profile at all', null],
    ])('returns undefined when the claim is %s', (_name, profile) => {
      expect(resolveOAuthPictureUrl(profile)).toBeUndefined();
    });
  });
});
