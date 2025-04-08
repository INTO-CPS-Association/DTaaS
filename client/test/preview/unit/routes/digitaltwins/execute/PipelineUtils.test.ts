import {
  fetchJobLogs,
  startPipeline,
  updatePipelineStateOnCompletion,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { JobSchema } from '@gitbeaker/rest';
import GitlabInstance from 'preview/util/gitlab';

describe('PipelineUtils', () => {
  const digitalTwin = mockDigitalTwin;
  const dispatch = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const setButtonText = jest.fn();
  const { gitlabInstance } = digitalTwin;
  const pipelineId = 1;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('starts pipeline and handles success', async () => {
    const mockExecute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'success';

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(mockExecute).toHaveBeenCalled();
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
  });

  it('starts pipeline and handles failed', async () => {
    const mockExecute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'failed';

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(mockExecute).toHaveBeenCalled();
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

  describe('fetchJobLogs', () => {
    it('fetches job logs', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockResolvedValue('log1');

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(mockGetPipelineJobs).toHaveBeenCalledWith(
        gitlabInstance.projectId,
        pipelineId,
      );
      expect(mockGetJobTrace).toHaveBeenCalledWith(gitlabInstance.projectId, 1);
      expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);
    });

    it('returns empty array if projectId is falsy', async () => {
      const mockGitlabInstance = {
        ...gitlabInstance,
        projectId: undefined,
        getPipelineJobs: jest.fn(),
        getJobTrace: jest.fn(),
      } as unknown as GitlabInstance;

      const result = await fetchJobLogs(mockGitlabInstance, pipelineId);
      expect(result).toEqual([]);
    });

    it('handles error when fetching job trace', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockRejectedValue(new Error('Error fetching trace'));

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(result).toEqual([
        { jobName: 'job1', log: 'Error fetching log content' },
      ]);
    });

    it('handles job with missing name', async () => {
      const mockJob = { id: 1 } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockResolvedValue('log content');

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(result).toEqual([{ jobName: 'Unknown', log: 'log content' }]);
    });

    it('handles non-string log content', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSchema;

      const mockGetPipelineJobs = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      mockGetPipelineJobs.mockResolvedValue([mockJob]);

      const mockGetJobTrace = jest.spyOn(gitlabInstance, 'getJobTrace');
      mockGetJobTrace.mockResolvedValue('');

      const result = await fetchJobLogs(gitlabInstance, pipelineId);

      expect(result).toEqual([{ jobName: 'job1', log: '' }]);
    });
  });
});
