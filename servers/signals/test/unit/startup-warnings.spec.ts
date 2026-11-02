import { describe, expect, it } from '@jest/globals';
import startupWarnings from 'src/config/startup-warnings';
import testConfig from 'test/helpers/config';

const CONFIGURED = {
  'gitlab-url': 'https://gitlab.example.org',
  'gitlab-client-id': 'dtaas-client-app',
};

describe('startup warnings', () => {
  it('has none when GitLab and the OAuth application are set', () => {
    expect(startupWarnings(testConfig(CONFIGURED))).toEqual([]);
  });

  it('warns when the OAuth application check is off', () => {
    const warnings = startupWarnings(
      testConfig({ ...CONFIGURED, 'gitlab-client-id': '' }),
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/gitlab-client-id is not set/);
  });

  it('warns when no GitLab is set', () => {
    const warnings = startupWarnings(
      testConfig({ ...CONFIGURED, 'gitlab-url': '' }),
    );
    expect(warnings).toEqual([
      'gitlab-url is not set: every request with a token is refused',
    ]);
  });
});
