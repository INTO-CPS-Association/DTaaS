import { JobSchema } from '@gitbeaker/rest';
import * as PipelineUtils from 'preview/route/digitaltwins/execute/pipelineUtils';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { previewStore as store } from 'test/preview/integration/integration.testUtil';

describe('PipelineUtils', () => {
  const digitalTwin = mockDigitalTwin;
  digitalTwin.lastExecutionStatus = 'success';

  const { gitlabInstance } = digitalTwin;

  beforeEach(() => {
    store.dispatch(setDigitalTwin({ assetName: 'mockedDTName', digitalTwin }));
  });

  afterEach(() => {
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
    const mockGetPipelineJobs = jest
      .spyOn(gitlabInstance, 'getPipelineJobs')
      .mockResolvedValue([
        {
          id: 1,
          name: 'job1',
          status: 'success',
          stage: 'build',
        } as unknown as JobSchema,
      ]);

    const mockGetJobTrace = jest
      .spyOn(gitlabInstance, 'getJobTrace')
      .mockResolvedValue('log1');

    const result = await PipelineUtils.fetchJobLogs(gitlabInstance, 1);

    expect(mockGetPipelineJobs).toHaveBeenCalledWith(
      gitlabInstance.projectId,
      1,
    );
    expect(mockGetJobTrace).toHaveBeenCalledWith(gitlabInstance.projectId, 1);
    expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);

    mockGetPipelineJobs.mockRestore();
    mockGetJobTrace.mockRestore();
  });
});
