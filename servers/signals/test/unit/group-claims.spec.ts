import { describe, expect, it } from '@jest/globals';
import grantsOfGroups from 'src/auth/group-claims';

describe('grantsOfGroups', () => {
  it('reads the levels of the access plan, where only a viewer cannot write', () => {
    expect(
      grantsOfGroups(
        ['alice_viewer', '/bob_member', 'carol_admin'],
        'access-plan',
        'DTaaS',
      ),
    ).toEqual({
      readers: ['alice', 'bob', 'carol'],
      writers: ['bob', 'carol'],
    });
  });

  it('reads the roles the Dex GitLab connector adds to a group path', () => {
    expect(
      grantsOfGroups(
        ['DTaaS/alice:developer', 'dtaas/bob:maintainer', 'DTaaS/carol:owner'],
        'dex-gitlab',
        'DTaaS',
      ),
    ).toEqual({
      readers: ['alice', 'bob', 'carol'],
      writers: ['alice', 'bob', 'carol'],
    });
  });

  it('reads only the format of the provider, so a GitLab group named like a level grants nothing through Dex', () => {
    expect(grantsOfGroups(['alice_admin'], 'dex-gitlab', 'DTaaS')).toEqual({
      readers: [],
      writers: [],
    });
    expect(
      grantsOfGroups(['DTaaS/alice:developer'], 'access-plan', 'DTaaS'),
    ).toEqual({ readers: [], writers: [] });
  });

  it('ignores nested paths, other groups and owner names GitLab would not allow', () => {
    const none = { readers: [], writers: [] };
    expect(
      grantsOfGroups(
        ['/dtaas/alice_admin', 'a:b_member', ' x_viewer', 'alice_guest'],
        'access-plan',
        'DTaaS',
      ),
    ).toEqual(none);
    expect(
      grantsOfGroups(
        [
          'Other/alice:developer',
          'DTaaS/a/b:developer',
          'DTaaS/:developer',
          'DTaaS/alice:reporter',
        ],
        'dex-gitlab',
        'DTaaS',
      ),
    ).toEqual(none);
  });

  it('lists an owner once', () => {
    expect(
      grantsOfGroups(['alice_viewer', 'alice_member'], 'access-plan', 'DTaaS'),
    ).toEqual({ readers: ['alice'], writers: ['alice'] });
  });
});
