import * as PipelineUtils from 'preview/route/digitaltwins/execute/pipelineUtils';
import cleanLog from 'model/backend/gitlab/cleanLog';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import { mockBackendInstance } from 'test/preview/__mocks__/global_mocks';
import { previewStore as store } from 'test/preview/integration/integration.testUtil';
import { JobSchema } from '@gitbeaker/rest';
import DigitalTwin from 'preview/util/digitalTwin';

describe('PipelineUtils', () => {
  let digitalTwin: DigitalTwin;

  beforeEach(() => {
    digitalTwin = new DigitalTwin('mockedDTName', mockBackendInstance);
    store.dispatch(setDigitalTwin({ assetName: 'mockedDTName', digitalTwin }));

    digitalTwin.execute = jest.fn().mockImplementation(async () => {
      digitalTwin.lastExecutionStatus = 'success';
      return Promise.resolve();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('starts pipeline and handle success', async () => {
    await PipelineUtils.startPipeline(digitalTwin, store.dispatch, jest.fn());
    const snackbarState = store.getState().snackbar;
    const expectedSnackbarState = {
      open: true,
      message:
        'Execution started successfully for MockedDTName. Wait until completion for the logs...',
      severity: 'success',
    };
    expect(snackbarState).toEqual(expectedSnackbarState);
  });

  it('updates pipeline state on completion', async () => {
    await PipelineUtils.updatePipelineStateOnCompletion(
      digitalTwin,
      [{ jobName: 'job1', log: 'log1' }],
      jest.fn(),
      jest.fn(),
      store.dispatch,
    );
    const state = store.getState().digitalTwin.digitalTwin;
    expect(state.mockedDTName.jobLogs).toEqual([
      { jobName: 'job1', log: 'log1' },
    ]);
    expect(state.mockedDTName.pipelineCompleted).toBe(true);
    expect(state.mockedDTName.pipelineLoading).toBe(false);
  });

  it('fetches job logs', async () => {
    const mockJob = { id: 1, name: 'job1' } as JobSchema;

    const mockGetPipelineJobs = jest.spyOn(
      mockBackendInstance,
      'getPipelineJobs',
    );
    mockGetPipelineJobs.mockResolvedValue([mockJob]);

    const mockGetJobTrace = jest.spyOn(mockBackendInstance, 'getJobTrace');
    mockGetJobTrace.mockResolvedValue('log1');

    const result = await PipelineUtils.fetchJobLogs(mockBackendInstance, 1);

    expect(mockGetPipelineJobs).toHaveBeenCalledWith(
      mockBackendInstance.getProjectId(),
      1,
    );
    expect(mockGetJobTrace).toHaveBeenCalledWith(
      mockBackendInstance.getProjectId(),
      1,
    );
    expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);
  });

  // Test integration with fetchJobLogs
  it('properly cleans logs when fetched from GitLab', async () => {
    const rawLog =
      '\u001b[32mRunning job\u001b[0m\nsection_start:1234:setup\nSetting up environment\nsection_end:1234:setup';

    const mockJob = { id: 123, name: 'test-job' } as JobSchema;

    const mockGetPipelineJobs = jest.spyOn(
      mockBackendInstance,
      'getPipelineJobs',
    );
    mockGetPipelineJobs.mockResolvedValue([mockJob]);

    const mockGetJobTrace = jest.spyOn(mockBackendInstance, 'getJobTrace');
    mockGetJobTrace.mockResolvedValue(rawLog);

    const logs = await PipelineUtils.fetchJobLogs(mockBackendInstance, 456);

    expect(logs).toHaveLength(1);
    expect(logs[0].jobName).toBe('test-job');
    expect(logs[0].log).toBe('Running job\nSetting up environment');
  });

  it('handles realistic GitLab CI logs', () => {
    const realWorldLog = `Running with gitlab-runner 15.6.0
section_start:1678901234:prepare_environment
Preparing environment
section_end:1678901234:prepare_environment
section_start:1678901235:get_sources
Getting source from Git repository
\u001b[32mFetching changes...\u001b[0m
section_end:1678901235:get_sources
section_start:1678901236:build
Building project...
\u001b[33mWarning: Deprecated feature used\u001b[0m
\u001b[32mBuild completed successfully\u001b[0m
section_end:1678901236:build`;

    const cleaned = cleanLog(realWorldLog);

    expect(cleaned).not.toContain('\u001b');
    expect(cleaned).not.toContain('section_start');
    expect(cleaned).not.toContain('section_end');
    expect(cleaned).toContain('Preparing environment');
    expect(cleaned).toContain('Getting source from Git repository');
    expect(cleaned).toContain('Fetching changes');
    expect(cleaned).toContain('Warning: Deprecated feature used');
    expect(cleaned).toContain('Build completed successfully');
  });
});
