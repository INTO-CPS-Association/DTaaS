import {
  resolveOAuthDisplayName,
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

    it('resolves username from email local part for dex profiles', () => {
      expect(
        resolveOAuthUsername({
          email: 'dex-user@example.com',
        }),
      ).toBe('dex-user');
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
  });

  describe('resolveOAuthDisplayName', () => {
    it('prefers name over username-style claims', () => {
      expect(
        resolveOAuthDisplayName(
          {
            name: 'Jane Doe',
            preferred_username: 'jane',
          },
          'fallback-user',
        ),
      ).toBe('Jane Doe');
    });

    it('uses fallback username when no display claims are available', () => {
      expect(resolveOAuthDisplayName({}, 'fallback-user')).toBe('fallback-user');
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
  });
});
