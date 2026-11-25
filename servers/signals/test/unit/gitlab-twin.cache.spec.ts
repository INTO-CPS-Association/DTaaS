import { afterEach, describe, expect, it, jest } from '@jest/globals';
import GitLabTwinPolicy from 'src/authz/gitlab-twin.policy';
import TwinReader from 'src/authz/twin-reader';
import testConfig from 'test/helpers/config';
import {
  ALICE,
  PROJECT,
  gitlabFor,
  policyWith,
} from 'test/helpers/gitlab-twin';
import ownersOf from 'test/helpers/owners';

describe('GitLabTwinPolicy caches', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('rebuilds the index only when the branch moves', async () => {
    jest.useFakeTimers({ now: 0 });
    const state = { sha: 's1', projects: [PROJECT] };
    const gitlab = gitlabFor(state);
    const policy = policyWith(gitlab);
    await policy.listResources(ALICE, 'stream');
    jest.setSystemTime(6000);
    await policy.listResources(ALICE, 'stream');
    expect(gitlab.callsTo(/repository\/tree/)).toBe(1);
    expect(gitlab.callsTo(/repository\/branches/)).toBe(2);
    state.sha = 's2';
    jest.setSystemTime(12000);
    await policy.listResources(ALICE, 'stream');
    expect(gitlab.callsTo(/repository\/tree/)).toBe(2);
  });

  it('asks GitLab for the branch once within its short cache', async () => {
    jest.useFakeTimers({ now: 0 });
    const gitlab = gitlabFor({ sha: 's1', projects: [PROJECT] });
    const policy = policyWith(gitlab);
    await policy.listResources(ALICE, 'stream');
    jest.setSystemTime(4000);
    await policy.listResources(ALICE, 'stream');
    expect(gitlab.callsTo(/repository\/branches/)).toBe(1);
    // Another token is another question to GitLab, never a shared answer.
    await policy.listResources({ ...ALICE, token: 'token-b' }, 'stream');
    expect(gitlab.callsTo(/repository\/branches/)).toBe(2);
  });

  it('drops a removed project within the project cache, whatever the branch cache holds', async () => {
    jest.useFakeTimers({ now: 0 });
    const state = { sha: 's1', projects: [PROJECT] as unknown[] };
    const gitlab = gitlabFor(state);
    const config = testConfig({ 'branch-cache-ttl': 10 * 60_000 });
    const policy = new GitLabTwinPolicy(
      config,
      gitlab.asClient(),
      new TwinReader(config, gitlab.asClient()),
      ownersOf(),
    );
    expect(await policy.listResources(ALICE, 'stream')).not.toEqual([]);
    state.projects = [];
    jest.setSystemTime(60_001);
    expect(await policy.listResources(ALICE, 'stream')).toEqual([]);
  });

  it('caches the project list per user', async () => {
    const gitlab = gitlabFor({ sha: 's1', projects: [PROJECT] });
    const policy = policyWith(gitlab);
    await policy.listResources(ALICE, 'stream');
    await policy.listResources(ALICE, 'range');
    expect(gitlab.callsTo(/groups\/DTaaS\/projects/)).toBe(1);
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
