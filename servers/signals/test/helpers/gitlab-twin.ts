import GitLabTwinPolicy from 'src/authz/gitlab-twin.policy';
import TwinReader from 'src/authz/twin-reader';
import testConfig from 'test/helpers/config';
import FakeGitLabClient from 'test/helpers/fake-gitlab-client';
import ownersOf from 'test/helpers/owners';
import { PUMP } from 'test/helpers/twins';

export const ALICE = { id: '7', username: 'alice', token: 'token-a' };
export const PROJECT = {
  id: 10,
  path: 'alice',
  path_with_namespace: 'DTaaS/alice',
};

export const TREE = [
  { name: 'pump', type: 'tree' },
  { name: 'README.md', type: 'blob' },
  { name: 'broken', type: 'tree' },
];
export const PROJECTS =
  /^api\/v4\/groups\/DTaaS\/projects\?min_access_level=20&simple=true$/;
export const BRANCH = /^api\/v4\/projects\/10\/repository\/branches\/master$/;
export const TWINS =
  /^api\/v4\/projects\/10\/repository\/tree\?path=digital_twins&ref=/;

/** GitLab with one project of alice's, at the commit state.sha. */
export function gitlabFor(state: { sha: string; projects: unknown[] }) {
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

/** The policy over a GitLab and an owner map, with the test defaults. */
export function policyWith(
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
