import { describe, expect, it } from '@jest/globals';
import ownersOfGroups from 'src/auth/group-claims';

describe('ownersOfGroups', () => {
  it('reads the levels of the access plan, with or without the leading slash', () => {
    expect(
      ownersOfGroups(
        ['alice_viewer', '/bob_member', 'carol_admin'],
        'access-plan',
        'DTaaS',
      ),
    ).toEqual(['alice', 'bob', 'carol']);
  });

  it('reads the roles the Dex GitLab connector adds to a group path', () => {
    expect(
      ownersOfGroups(
        ['DTaaS/alice:developer', 'dtaas/bob:maintainer', 'DTaaS/carol:owner'],
        'dex-gitlab',
        'DTaaS',
      ),
    ).toEqual(['alice', 'bob', 'carol']);
  });

  it('reads only the format of the provider, so a GitLab group named like a level grants nothing through Dex', () => {
    expect(ownersOfGroups(['alice_admin'], 'dex-gitlab', 'DTaaS')).toEqual([]);
    expect(
      ownersOfGroups(['DTaaS/alice:developer'], 'access-plan', 'DTaaS'),
    ).toEqual([]);
  });

  it('ignores nested paths, other groups and owner names GitLab would not allow', () => {
    expect(
      ownersOfGroups(
        ['/dtaas/alice_admin', 'a:b_member', ' x_viewer', 'alice_guest'],
        'access-plan',
        'DTaaS',
      ),
    ).toEqual([]);
    expect(
      ownersOfGroups(
        [
          'Other/alice:developer',
          'DTaaS/a/b:developer',
          'DTaaS/:developer',
          'DTaaS/alice:reporter',
        ],
        'dex-gitlab',
        'DTaaS',
      ),
    ).toEqual([]);
  });

  // Anyone who can create or rename groups in the provider must not reach
  // another group's signals through a name that looks alike.
  it('maps colliding names to different owners or to none', () => {
    expect(
      ownersOfGroups(['/a/b_viewer', 'a-b_viewer'], 'access-plan', 'DTaaS'),
    ).toEqual(['a-b']);
    expect(
      ownersOfGroups(
        ['DTaaS/a/b:developer', 'DTaaS/a-b:developer', 'DTaaSx/a-b:developer'],
        'dex-gitlab',
        'DTaaS',
      ),
    ).toEqual(['a-b']);
  });

  it('lists an owner once', () => {
    expect(
      ownersOfGroups(['alice_viewer', 'alice_member'], 'access-plan', 'DTaaS'),
    ).toEqual(['alice']);
  });
});
