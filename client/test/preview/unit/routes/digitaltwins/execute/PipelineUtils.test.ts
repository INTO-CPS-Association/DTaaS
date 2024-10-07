import { JobSchema } from '@gitbeaker/rest';
import {
  fetchJobLogs,
  startPipeline,
  updatePipelineStateOnCompletion,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

describe('PipelineUtils', () => {
  const digitalTwin = mockDigitalTwin;
  const dispatch = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const setButtonText = jest.fn();
  const { gitlabInstance } = digitalTwin;
  const pipelineId = 1;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts pipeline and handles success', async () => {
    const execute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'success';

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(execute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: expect.stringContaining('Execution started successfully'),
          severity: 'success',
        },
      }),
    );
    expect(setLogButtonDisabled).toHaveBeenCalledWith(true);

    execute.mockRestore();
  });

  it('starts pipeline and handles failed', async () => {
    const execute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'failed';

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(execute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: expect.stringContaining('Execution failed'),
          severity: 'error',
        },
      }),
    );
    expect(setLogButtonDisabled).toHaveBeenCalledWith(true);

    execute.mockRestore();
  });

  it('updates pipeline state on completion', async () => {
    await updatePipelineStateOnCompletion(
      digitalTwin,
      [{ jobName: 'job1', log: 'log1' }],
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
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

    const result = await fetchJobLogs(gitlabInstance, pipelineId);

    expect(mockGetPipelineJobs).toHaveBeenCalledWith(
      gitlabInstance.projectId,
      pipelineId,
    );
    expect(mockGetJobTrace).toHaveBeenCalledWith(gitlabInstance.projectId, 1);
    expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);

    mockGetPipelineJobs.mockRestore();
    mockGetJobTrace.mockRestore();
  });
});
