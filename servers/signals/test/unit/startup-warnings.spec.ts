import { describe, expect, it } from '@jest/globals';
import startupWarnings, { startupErrors } from 'src/config/startup-warnings';
import testConfig from 'test/helpers/config';

const CONFIGURED = {
  'gitlab-url': 'https://gitlab.example.org',
  'gitlab-client-id': ['dtaas-client-app'],
  'owners-file': '/run/secrets/signals_owner_topics.json',
};

describe('startup warnings', () => {
  it('has none when GitLab and the OAuth application are set', () => {
    expect(startupWarnings(testConfig(CONFIGURED))).toEqual([]);
    expect(startupErrors(testConfig(CONFIGURED))).toEqual([]);
  });

  it('refuses to start when the OAuth application check is off', () => {
    const errors = startupErrors(
      testConfig({ ...CONFIGURED, 'gitlab-client-id': [] }),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/gitlab-client-id is not set/);
    expect(errors[0]).toMatch(/allow-any-gitlab-client/);
  });

  it('starts with a warning when the development flag allows any client', () => {
    const config = testConfig({
      ...CONFIGURED,
      'gitlab-client-id': [],
      'allow-any-gitlab-client': true,
    });
    expect(startupErrors(config)).toEqual([]);
    const warnings = startupWarnings(config);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/allow-any-gitlab-client is on/);
  });

  it('warns when no GitLab is set, and then needs no client id', () => {
    const config = testConfig({
      ...CONFIGURED,
      'gitlab-url': '',
      'gitlab-client-id': [],
    });
    expect(startupWarnings(config)).toEqual([
      'gitlab-url is not set: every request with a token is refused',
    ]);
    expect(startupErrors(config)).toEqual([]);
  });

  it('warns that no topic is served without the owner map', () => {
    const config = testConfig({ ...CONFIGURED, 'owners-file': '' });
    expect(startupWarnings(config)).toEqual([
      'owners-file is not set: no topic is served, since no topic can be tied to its owner',
    ]);
  });

  it('warns when a proxy sets the user header and no proxy is trusted', () => {
    const header = {
      ...CONFIGURED,
      'forwarded-user-header': 'x-forwarded-user',
    };
    const warnings = startupWarnings(testConfig(header));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/trusted-proxies is empty/);
    expect(
      startupWarnings(
        testConfig({ ...header, 'trusted-proxies': ['172.18.0.0/16'] }),
      ),
    ).toEqual([]);
  });
});
