import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GitLabError } from 'src/auth/gitlab.client';
import FakeGitLabClient from 'test/helpers/fake-gitlab-client';
import {
  ALICE,
  BRANCH,
  PROJECT,
  PROJECTS,
  TREE,
  TWINS,
  gitlabFor,
  policyWith,
} from 'test/helpers/gitlab-twin';
import { PUMP, visualisationOf } from 'test/helpers/twins';

// Alice can read her own project and Bob's, and both declare one topic.
function sharedTopicGitLab() {
  const twinOf = (owner: string) => [
    new RegExp(`files\\/digital_twins%2F${owner}%2Fvisualisation`),
    () => visualisationOf(['shared/topic']),
  ];
  return new FakeGitLabClient([
    [
      PROJECTS,
      () => [
        PROJECT,
        { id: 11, path: 'bob', path_with_namespace: 'DTaaS/bob' },
      ],
    ],
    [/repository\/branches\/master$/, () => ({ commit: { id: 's1' } })],
    [/projects\/10\/repository\/tree/, () => [{ name: 'alice', type: 'tree' }]],
    [/projects\/11\/repository\/tree/, () => [{ name: 'bob', type: 'tree' }]],
    twinOf('alice') as [RegExp, () => unknown],
    twinOf('bob') as [RegExp, () => unknown],
  ]);
}

describe('GitLabTwinPolicy', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("lists the topics of the twins in the user's projects", async () => {
    const gitlab = gitlabFor({ sha: 's1', projects: [PROJECT] });
    const targets = await policyWith(gitlab).listResources(ALICE, 'stream');
    expect(targets.map((t) => t.path)).toEqual([
      'alice/pump/flow',
      'alice/pump/pressure',
    ]);
    expect(new Set(gitlab.tokens)).toEqual(new Set(['token-a']));
  });

  it('gives a user of no project nothing', async () => {
    const gitlab = gitlabFor({ sha: 's1', projects: [] });
    const policy = policyWith(gitlab);
    await expect(policy.listResources(ALICE, 'stream')).resolves.toEqual([]);
    await expect(
      policy.check(ALICE, 'stream', {
        path: 'alice/pump/flow',
        owner: 'alice',
      }),
    ).resolves.toEqual({
      allowed: false,
    });
  });

  it('allows a declared topic through check', async () => {
    const policy = policyWith(gitlabFor({ sha: 's1', projects: [PROJECT] }));
    const decision = await policy.check(ALICE, 'range', {
      path: 'alice/pump/flow',
      owner: 'alice',
    });
    expect(decision).toEqual({
      allowed: true,
      target: expect.objectContaining({ owner: 'alice' }),
    });
  });

  it('ignores a project outside the group and an unknown action', async () => {
    const outside = {
      id: 10,
      path: 'alice',
      path_with_namespace: 'Other/alice',
    };
    const policy = policyWith(
      gitlabFor({ sha: 's1', projects: [outside, { id: 'x' }] }),
    );
    await expect(policy.listResources(ALICE, 'stream')).resolves.toEqual([]);
    const known = policyWith(gitlabFor({ sha: 's1', projects: [PROJECT] }));
    await expect(known.listResources(ALICE, 'write' as never)).resolves.toEqual(
      [],
    );
  });

  it('asks GitLab for the projects the user may write before a command', async () => {
    const gitlab = new FakeGitLabClient([
      [/min_access_level=30&simple=true$/, () => [PROJECT]],
      [BRANCH, () => ({ commit: { id: 's1' } })],
      [TWINS, () => TREE],
      [/files\/digital_twins%2Fpump%2F/, () => PUMP],
    ]);
    const targets = await policyWith(gitlab).listResources(ALICE, 'command');
    expect(targets.map((t) => t.path)).toContain('alice/pump/flow');
    expect(gitlab.callsTo(/min_access_level=20/)).toBe(0);
  });

  it('has no twins for a project without the branch or the folder', async () => {
    const gitlab = new FakeGitLabClient([
      [/groups\/DTaaS\/projects/, () => [PROJECT, { ...PROJECT, id: 11 }]],
      [/projects\/11\/repository\/branches/, () => ({ commit: { id: 's1' } })],
    ]);
    await expect(
      policyWith(gitlab).listResources(ALICE, 'stream'),
    ).resolves.toEqual([]);
  });

  it('fails when GitLab fails, so the caller can deny', async () => {
    const gitlab = new FakeGitLabClient([
      [/./, (r) => new GitLabError(500, r)],
    ]);
    await expect(
      policyWith(gitlab).listResources(ALICE, 'stream'),
    ).rejects.toBeInstanceOf(GitLabError);
  });

  it('tells apart two owners that declare the same topic', async () => {
    // Only an owner map that gives both owners the prefix lets this happen.
    const policy = policyWith(sharedTopicGitLab(), {
      alice: ['shared/'],
      bob: ['shared/'],
    });
    const path = 'shared/topic';
    const ofBob = await policy.check(ALICE, 'stream', { path, owner: 'bob' });
    const ofAlice = await policy.check(ALICE, 'stream', {
      path,
      owner: 'alice',
    });
    const ofCarol = await policy.check(ALICE, 'stream', {
      path,
      owner: 'carol',
    });
    expect(ofBob).toEqual({
      allowed: true,
      target: expect.objectContaining({ owner: 'bob' }),
    });
    expect(ofAlice).toEqual({
      allowed: true,
      target: expect.objectContaining({ owner: 'alice' }),
    });
    expect(ofCarol).toEqual({ allowed: false });
  });
});
