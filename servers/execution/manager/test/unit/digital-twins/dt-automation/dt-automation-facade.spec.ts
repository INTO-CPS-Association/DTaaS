import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import {
  type Facade,
  type History,
  actual,
  digitalTwinOnGitlab,
  gitlabLists,
  gitlabRefusal,
  initDigitalTwin,
  packageSettings,
  resetPackage,
  running,
  runningRecord,
  startFacade,
} from '../../../support/dt-automation-package.js';

describe('DtAutomationFacade', () => {
  let history: History;
  let facade: Facade;

  beforeEach(() => {
    resetPackage();
    ({ facade, history } = startFacade());
  });

  afterEach(() => {
    facade.onModuleDestroy();
    jest.restoreAllMocks();
  });

  describe('setting up dt-automation', () => {
    it("uses the package's defaults for the settings that are not configured", () => {
      expect(packageSettings()).toMatchObject({
        GROUP_NAME: actual.GROUP_NAME,
        DT_DIRECTORY: actual.DT_DIRECTORY,
        COMMON_LIBRARY_PROJECT_NAME: actual.COMMON_LIBRARY_PROJECT_NAME,
        RUNNER_TAG: actual.RUNNER_TAG,
        BRANCH_NAME: actual.BRANCH_NAME,
      });
    });

    it('uses the configured settings', () => {
      facade.onModuleDestroy();

      ({ facade, history } = startFacade({
        EXECUTION_MANAGER_GITLAB_GROUP: 'twins',
        EXECUTION_MANAGER_GITLAB_DT_DIRECTORY: 'dts',
        EXECUTION_MANAGER_GITLAB_COMMON_LIBRARY_PROJECT: 'shared',
        EXECUTION_MANAGER_GITLAB_RUNNER_TAG: 'windows',
        EXECUTION_MANAGER_GITLAB_BRANCH: 'main',
      }));

      expect(packageSettings()).toMatchObject({
        GROUP_NAME: 'twins',
        DT_DIRECTORY: 'dts',
        COMMON_LIBRARY_PROJECT_NAME: 'shared',
        RUNNER_TAG: 'windows',
        BRANCH_NAME: 'main',
      });
    });
  });

  describe('listing the digital twins', () => {
    it('returns the digital twins that GitLab lists', async () => {
      gitlabLists(null, 'hello-world');

      expect(await facade.listDigitalTwins()).toEqual([
        { name: 'hello-world', description: 'About hello-world' },
      ]);
    });

    it('reports a GitLab failure when no digital twin could be listed', async () => {
      gitlabLists('An error occurred while fetching assets: 401');

      await expect(facade.listDigitalTwins()).rejects.toMatchObject({
        code: 'gitlab-failure',
        message: 'An error occurred while fetching assets: 401',
      });
    });

    it('lists the digital twins and warns when only another listing failed', async () => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      gitlabLists(
        'An error occurred while fetching assets: 404',
        'hello-world',
      );

      expect(await facade.listDigitalTwins()).toHaveLength(1);
      expect(warn).toHaveBeenCalledWith(
        'An error occurred while fetching assets: 404',
      );
    });
  });

  describe('reading a digital twin', () => {
    it('reads the descriptions and the names of the files', async () => {
      digitalTwinOnGitlab(history);

      expect(await facade.getDigitalTwin('hello-world')).toEqual({
        name: 'hello-world',
        description: 'Says hello',
        fullDescription: '# hello-world',
        descriptionFiles: ['description.md', 'README.md'],
        configFiles: ['config.json'],
        lifecycleFiles: ['execute', 'terminate'],
      });
      expect(initDigitalTwin).toHaveBeenCalledWith('hello-world');
    });

    it("reports GitLab's reason when a digital twin cannot be read", async () => {
      initDigitalTwin.mockRejectedValue(gitlabRefusal());

      await expect(facade.getDigitalTwin('hello-world')).rejects.toMatchObject({
        code: 'gitlab-failure',
        message: 'Could not read hello-world from GitLab: 401 Unauthorized',
      });
    });

    it('describes a thrown value that is not an error', async () => {
      initDigitalTwin.mockRejectedValue('timeout');

      await expect(facade.getDigitalTwin('hello-world')).rejects.toThrow(
        'Could not read hello-world from GitLab: timeout',
      );
    });
  });

  describe('reading the executions', () => {
    it("lists one digital twin's executions", async () => {
      await history.add(running);
      await history.add({ ...running, id: 'e-2', dtName: 'other' });

      expect(await facade.listExecutions('hello-world')).toEqual([
        runningRecord,
      ]);
    });

    it('finds an execution by its ID and returns null for an unknown one', async () => {
      await history.add(running);

      expect(await facade.findExecution('e-1')).toEqual(runningRecord);
      expect(await facade.findExecution('nope')).toBeNull();
    });
  });

  it('completes the execution changes when it shuts down', () => {
    const complete = jest.fn();
    facade.executionChanges().subscribe({ complete });

    facade.onModuleDestroy();

    expect(complete).toHaveBeenCalledTimes(1);
  });
});
