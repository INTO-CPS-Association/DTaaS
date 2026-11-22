import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';
import {
  type Facade,
  type History,
  actual,
  digitalTwinOnGitlab,
  failureLog,
  gitlabRefusal,
  initDigitalTwin,
  resetPackage,
  runningRecord,
  startFacade,
  stopPipelines,
} from '../../../support/dt-automation-package.js';

describe('DtAutomationFacade executions', () => {
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

  describe('starting an execution', () => {
    it('starts the pipeline with the options and returns the record', async () => {
      const digitalTwin = digitalTwinOnGitlab(history);
      const options = { runnerTag: 'windows', branch: 'main' };

      expect(await facade.startExecution('hello-world', options)).toEqual(
        runningRecord,
      );
      expect(digitalTwin.execute).toHaveBeenCalledWith(
        false,
        'windows',
        'main',
      );
    });

    it('publishes a started execution', async () => {
      digitalTwinOnGitlab(history);
      const seen: ExecutionRecord[] = [];
      facade.executionChanges().subscribe((record) => seen.push(record));

      await facade.startExecution('hello-world', {});

      expect(seen).toEqual([runningRecord]);
    });

    it("reports GitLab's reason when the digital twin cannot be loaded", async () => {
      initDigitalTwin.mockRejectedValue(gitlabRefusal());

      await expect(
        facade.startExecution('hello-world', {}),
      ).rejects.toMatchObject({
        code: 'gitlab-failure',
        message: 'Could not start hello-world on GitLab: 401 Unauthorized',
      });
    });

    it('reports the reason the package logged when no pipeline started', async () => {
      const digitalTwin = digitalTwinOnGitlab(history);
      digitalTwin.execute.mockImplementation(async () => {
        digitalTwin.backend.logs.push(failureLog('403 Forbidden'));
        return null;
      });

      await expect(
        facade.startExecution('hello-world', {}),
      ).rejects.toMatchObject({
        code: 'gitlab-failure',
        message: 'Could not start hello-world on GitLab: 403 Forbidden',
      });
    });

    it('reports an unknown error when the package logged no reason', async () => {
      digitalTwinOnGitlab(history).execute.mockResolvedValue(null);

      await expect(facade.startExecution('hello-world', {})).rejects.toThrow(
        'Could not start hello-world on GitLab: unknown error',
      );
    });
  });

  describe('stopping an execution', () => {
    it('cancels the pipelines and returns the record', async () => {
      digitalTwinOnGitlab(history);
      await facade.startExecution('hello-world', {});

      expect(await facade.stopExecution('hello-world', 'e-1')).toEqual({
        ...runningRecord,
        status: 'canceled',
      });
      expect(stopPipelines).toHaveBeenCalledWith(
        expect.objectContaining({ DTName: 'hello-world' }),
        'e-1',
      );
    });

    it("reports GitLab's reason when the cancel did not succeed", async () => {
      digitalTwinOnGitlab(history);
      stopPipelines.mockResolvedValue({
        success: false,
        error: new Error('403 Forbidden'),
      });

      await expect(
        facade.stopExecution('hello-world', 'e-1'),
      ).rejects.toMatchObject({
        code: 'gitlab-failure',
        message: 'Could not stop execution e-1 of hello-world: 403 Forbidden',
      });
    });

    it('reports the logged reason when the package recorded an error', async () => {
      const digitalTwin = digitalTwinOnGitlab(history);
      digitalTwin.lastExecutionStatus = actual.ExecutionStatus.ERROR;
      digitalTwin.backend.logs.push(failureLog('pipeline not found'));
      stopPipelines.mockResolvedValue({ success: true });

      await expect(facade.stopExecution('hello-world', 'e-1')).rejects.toThrow(
        'Could not stop execution e-1 of hello-world: pipeline not found',
      );
    });
  });

  it('follows two executions that run at the same time', async () => {
    digitalTwinOnGitlab(history);
    const seen: string[][] = [];
    facade
      .executionChanges()
      .subscribe((record) => seen.push([record.id, record.status]));

    await facade.startExecution('hello-world', {});
    await facade.startExecution('hello-world', {});
    await facade.stopExecution('hello-world', 'e-1');

    expect(seen).toEqual([
      ['e-1', 'running'],
      ['e-2', 'running'],
      ['e-1', 'canceled'],
    ]);
    expect(await facade.findExecution('e-2')).toMatchObject({
      id: 'e-2',
      status: 'running',
    });
  });
});
