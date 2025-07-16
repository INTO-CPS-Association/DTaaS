import {
  startPipeline,
  updatePipelineStateOnCompletion,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { fetchJobLogs } from 'model/backend/gitlab/execution/logFetching';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import {
  BackendInterface,
  JobSummary,
} from 'model/backend/gitlab/UtilityInterfaces';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';

describe('PipelineUtils', () => {
  let digitalTwin: typeof mockDigitalTwin;
  const dispatch = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const setButtonText = jest.fn();
  const pipelineId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    digitalTwin = {
      ...mockDigitalTwin,
      backend: {
        ...mockDigitalTwin.backend,
        getProjectId: jest.fn().mockReturnValue(1),
        getPipelineJobs: jest.fn(),
        getJobTrace: jest.fn(),
      },
    } as unknown as typeof mockDigitalTwin;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts pipeline and handles success', async () => {
    digitalTwin.lastExecutionStatus = ExecutionStatus.SUCCESS;

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(digitalTwin.execute).toHaveBeenCalled();
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
    digitalTwin.lastExecutionStatus = ExecutionStatus.FAILED;

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(digitalTwin.execute).toHaveBeenCalled();
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
      const mockJob = { id: 1, name: 'job1' } as JobSummary;

      (digitalTwin.backend.getPipelineJobs as jest.Mock).mockResolvedValue([
        mockJob,
      ]);

      (digitalTwin.backend.getJobTrace as jest.Mock).mockResolvedValue('log1');

      const result = await fetchJobLogs(digitalTwin.backend, pipelineId);

      expect(digitalTwin.backend.getPipelineJobs).toHaveBeenCalledWith(
        digitalTwin.backend.getProjectId(),
        pipelineId,
      );
      expect(digitalTwin.backend.getJobTrace).toHaveBeenCalledWith(
        digitalTwin.backend.getProjectId(),
        1,
      );
      expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);
    });

    it('returns empty array if projectId is falsy', async () => {
      const mockBackendInstance = {
        ...digitalTwin.backend,
        getProjectId: jest.fn().mockReturnValue(undefined),
        getPipelineJobs: jest.fn(),
        getJobTrace: jest.fn(),
      } as unknown as BackendInterface;

      const result = await fetchJobLogs(mockBackendInstance, pipelineId);
      expect(result).toEqual([]);
    });

    it('handles error when fetching job trace', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSummary;

      (digitalTwin.backend.getPipelineJobs as jest.Mock).mockResolvedValue([
        mockJob,
      ]);

      (digitalTwin.backend.getJobTrace as jest.Mock).mockRejectedValue(
        new Error('Error fetching trace'),
      );

      const result = await fetchJobLogs(digitalTwin.backend, pipelineId);

      expect(result).toEqual([
        { jobName: 'job1', log: 'Error fetching log content' },
      ]);
    });

    it('handles job with missing name', async () => {
      const mockJob = { id: 1 } as JobSummary;

      (digitalTwin.backend.getPipelineJobs as jest.Mock).mockResolvedValue([
        mockJob,
      ]);
      (digitalTwin.backend.getJobTrace as jest.Mock).mockResolvedValue(
        'log content',
      );

      const result = await fetchJobLogs(digitalTwin.backend, pipelineId);

      expect(result).toEqual([{ jobName: 'Unknown', log: 'log content' }]);
    });

    it('handles non-string log content', async () => {
      const mockJob = { id: 1, name: 'job1' } as JobSummary;

      (digitalTwin.backend.getPipelineJobs as jest.Mock).mockResolvedValue([
        mockJob,
      ]);

      (digitalTwin.backend.getJobTrace as jest.Mock).mockResolvedValue('');

      const result = await fetchJobLogs(digitalTwin.backend, pipelineId);

      expect(result).toEqual([{ jobName: 'job1', log: '' }]);
    });
  });
});
