import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GitLabError } from 'src/auth/gitlab.client';
import GitLabTwinPolicy from 'src/authz/gitlab-twin.policy';
import TwinReader from 'src/authz/twin-reader';
import ownersOf from 'test/helpers/owners';
import testConfig from 'test/helpers/config';
import FakeGitLabClient from 'test/helpers/fake-gitlab-client';
import { PUMP, visualisationOf } from 'test/helpers/twins';

const ALICE = { id: '7', username: 'alice', token: 'token-a' };
const PROJECT = { id: 10, path: 'alice', path_with_namespace: 'DTaaS/alice' };

const TREE = [
  { name: 'pump', type: 'tree' },
  { name: 'README.md', type: 'blob' },
  { name: 'broken', type: 'tree' },
];
const PROJECTS =
  /^api\/v4\/groups\/DTaaS\/projects\?min_access_level=20&simple=true$/;
const BRANCH = /^api\/v4\/projects\/10\/repository\/branches\/master$/;
const TWINS =
  /^api\/v4\/projects\/10\/repository\/tree\?path=digital_twins&ref=/;

function gitlabFor(state: { sha: string; projects: unknown[] }) {
  return new FakeGitLabClient([
    [PROJECTS, () => state.projects],
    [BRANCH, () => ({ commit: { id: state.sha } })],
    [TWINS, () => TREE],
    [
      /files\/digital_twins%2Fpump%2Fvisualisation\.json\/raw\?ref=/,
      () => PUMP,
    ],
    [
      /files\/digital_twins%2Fbroken%2Fvisualisation\.json\/raw/,
      () => '{not json',
    ],
  ]);
}

function policyWith(
  gitlab: FakeGitLabClient,
  owners?: Record<string, string[]>,
) {
  const config = testConfig();
  return new GitLabTwinPolicy(
    config,
    gitlab.asClient(),
    new TwinReader(config, gitlab.asClient()),
    ownersOf(owners),
  );
}

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

  it('rebuilds the index only when the branch moves', async () => {
    const state = { sha: 's1', projects: [PROJECT] };
    const gitlab = gitlabFor(state);
    const policy = policyWith(gitlab);
    await policy.listResources(ALICE, 'stream');
    await policy.listResources(ALICE, 'stream');
    expect(gitlab.callsTo(/repository\/tree/)).toBe(1);
    expect(gitlab.callsTo(/repository\/branches/)).toBe(2);
    state.sha = 's2';
    await policy.listResources(ALICE, 'stream');
    expect(gitlab.callsTo(/repository\/tree/)).toBe(2);
  });

  it('caches the project list per user', async () => {
    const gitlab = gitlabFor({ sha: 's1', projects: [PROJECT] });
    const policy = policyWith(gitlab);
    await policy.listResources(ALICE, 'stream');
    await policy.listResources(ALICE, 'range');
    expect(gitlab.callsTo(/groups\/DTaaS\/projects/)).toBe(1);
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

  it('reads the twins again once their index has expired', async () => {
    jest.useFakeTimers({ now: 0 });
    const gitlab = gitlabFor({ sha: 's1', projects: [PROJECT] });
    const config = testConfig({
      'twin-index-cache-ttl': 1000,
      'projects-cache-ttl': 1000,
    });
    const policy = new GitLabTwinPolicy(
      config,
      gitlab.asClient(),
      new TwinReader(config, gitlab.asClient()),
      ownersOf(),
    );
    await policy.listResources(ALICE, 'stream');
    jest.setSystemTime(2000);
    await policy.listResources(ALICE, 'stream');
    expect(gitlab.callsTo(/repository\/tree/)).toBe(2);
  });
});
