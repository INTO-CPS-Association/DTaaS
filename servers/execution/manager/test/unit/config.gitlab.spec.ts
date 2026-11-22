import { describe, expect, it } from '@jest/globals';
import Config from 'src/config/config.service.js';
import { GITLAB_ENV_VARIABLES } from 'src/config/gitlab-settings.js';
import { useConfigFile } from '../support/config-file.js';

const gitlabEnvVariables = Object.values(GITLAB_ENV_VARIABLES);

const fullSection = [
  'gitlab:',
  '  url: https://gitlab.example.org',
  '  username: user1',
  '  token: yaml-token',
  '  group: twins',
  '  dt-directory: dts',
  '  common-library-project: shared',
  '  branch: main',
  '  runner-tag: windows',
];

describe('Config service GitLab section', () => {
  const writeConfig = useConfigFile(gitlabEnvVariables);

  async function useYaml(lines: string[]): Promise<void> {
    await writeConfig(`${lines.join('\n')}\n`);
  }

  it('is created without the GitLab settings', () => {
    expect(() => new Config()).not.toThrow();
  });

  it.each([
    ['url', 'EXECUTION_MANAGER_GITLAB_URL'],
    ['username', 'EXECUTION_MANAGER_GITLAB_USERNAME'],
    ['token', 'EXECUTION_MANAGER_GITLAB_TOKEN'],
  ])('reports gitlab.%s when it is not set', async (name, variable) => {
    await useYaml(fullSection.filter((line) => !line.startsWith(`  ${name}:`)));

    expect(() => new Config().getGitlab()).toThrow(
      `gitlab.${name} is not set: set it in the configuration file or with ${variable}`,
    );
  });

  it('leaves the optional settings unset', async () => {
    await useYaml(fullSection.slice(0, 4));

    expect(new Config().getGitlab()).toEqual({
      url: 'https://gitlab.example.org',
      username: 'user1',
      token: 'yaml-token',
    });
  });

  it('loads the section from yaml', async () => {
    await useYaml(fullSection);

    expect(new Config().getGitlab()).toEqual({
      url: 'https://gitlab.example.org',
      username: 'user1',
      token: 'yaml-token',
      group: 'twins',
      'dt-directory': 'dts',
      'common-library-project': 'shared',
      branch: 'main',
      'runner-tag': 'windows',
    });
  });

  it('uses env vars to override the yaml settings', async () => {
    await useYaml(fullSection);
    process.env.EXECUTION_MANAGER_GITLAB_URL = ' https://gitlab.local ';
    process.env.EXECUTION_MANAGER_GITLAB_USERNAME = 'user2';
    process.env.EXECUTION_MANAGER_GITLAB_TOKEN = 'env-token';
    process.env.EXECUTION_MANAGER_GITLAB_GROUP = 'other';
    process.env.EXECUTION_MANAGER_GITLAB_DT_DIRECTORY = 'twins';
    process.env.EXECUTION_MANAGER_GITLAB_COMMON_LIBRARY_PROJECT = 'lib';
    process.env.EXECUTION_MANAGER_GITLAB_BRANCH = 'develop';
    process.env.EXECUTION_MANAGER_GITLAB_RUNNER_TAG = 'gpu';

    expect(new Config().getGitlab()).toEqual({
      url: 'https://gitlab.local',
      username: 'user2',
      token: 'env-token',
      group: 'other',
      'dt-directory': 'twins',
      'common-library-project': 'lib',
      branch: 'develop',
      'runner-tag': 'gpu',
    });
  });

  it('ignores blank env overrides', async () => {
    await useYaml(fullSection.slice(0, 4));
    gitlabEnvVariables.forEach((name) => {
      process.env[name] = '   ';
    });

    expect(new Config().getGitlab()).toMatchObject({ username: 'user1' });
  });

  it('rejects an empty yaml setting', async () => {
    await useYaml(['gitlab:', '  token: ""']);

    expect(() => new Config()).toThrow();
  });

  it('rejects an unknown yaml setting', async () => {
    await useYaml(['gitlab:', '  password: secret']);

    expect(() => new Config()).toThrow();
  });

  it('returns a copy of the section', async () => {
    await useYaml(fullSection.slice(0, 4));
    const config = new Config();
    config.getGitlab().url = 'https://changed.example.org';

    expect(config.getGitlab().url).toBe('https://gitlab.example.org');
  });
});
