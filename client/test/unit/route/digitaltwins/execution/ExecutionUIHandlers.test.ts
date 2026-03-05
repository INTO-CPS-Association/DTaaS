import { fetchJobLogs } from 'model/backend/gitlab/execution/logFetching';
import { JobSummary } from 'model/backend/interfaces/backendInterfaces';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  startPipeline,
  updatePipelineStateOnCompletion,
  updatePipelineStateOnStop,
} from 'route/digitaltwins/execution/executionStatusHandlers';
import { stopPipelines } from 'model/backend/gitlab/execution/pipelineCore';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';

describe('ExecutionsUIHandlers', () => {
  const digitalTwin = mockDigitalTwin;
  const dispatch = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const setButtonText = jest.fn();
  const pipelineId = 1;

  beforeEach(() => {
    digitalTwin.backend.getProjectId = jest.fn().mockReturnValue(1);
    digitalTwin.backend.getPipelineJobs = jest.fn();
    digitalTwin.backend.getJobTrace = jest.fn();
  });

  it('starts pipeline and handles success', async () => {
    const mockExecute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = ExecutionStatus.SUCCESS;
    digitalTwin.currentExecutionId = 'test-execution-id';

    dispatch.mockReset();
    setLogButtonDisabled.mockReset();

    setLogButtonDisabled.mockImplementation(() => {});

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(mockExecute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
    setLogButtonDisabled(false);
    expect(setLogButtonDisabled).toHaveBeenCalled();
  });

  it('starts pipeline and handles failed', async () => {
    const mockExecute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = ExecutionStatus.FAILED;
    digitalTwin.currentExecutionId = null;

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(mockExecute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: expect.stringContaining('Execution'),
          severity: 'error',
        },
      }),
    );
  });

  it('updates pipeline state on completion', async () => {
    const executionId = 'test-execution-id';
    jest.spyOn(digitalTwin, 'getExecutionHistoryById').mockResolvedValue({
      id: executionId,
      dtName: digitalTwin.DTName,
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    });
    jest.spyOn(digitalTwin, 'updateExecutionLogs').mockResolvedValue();
    jest.spyOn(digitalTwin, 'updateExecutionStatus').mockResolvedValue();

    dispatch.mockReset();

    await updatePipelineStateOnCompletion(
      digitalTwin,
      [{ jobName: 'job1', log: 'log1' }],
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );

    expect(dispatch).toHaveBeenCalled();
    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('updates pipeline state on stop', async () => {
    const executionId = 'test-execution-id';
    jest.spyOn(digitalTwin, 'getExecutionHistoryById').mockResolvedValue({
      id: executionId,
      dtName: digitalTwin.DTName,
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    });
    jest.spyOn(digitalTwin, 'updateExecutionStatus').mockResolvedValue();

    dispatch.mockReset();

    updatePipelineStateOnStop(
      digitalTwin,
      setButtonText,
      dispatch,
      executionId,
    );

    expect(dispatch).toHaveBeenCalled();
    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('stops pipelines for a specific execution', async () => {
    const executionId = 'test-execution-id';
    jest.spyOn(digitalTwin, 'getExecutionHistoryById').mockResolvedValue({
      id: executionId,
      dtName: digitalTwin.DTName,
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    });
    const mockStop = jest.spyOn(digitalTwin, 'stop');
    mockStop.mockResolvedValue(undefined);

    await stopPipelines(digitalTwin, executionId);

    expect(mockStop).toHaveBeenCalledTimes(2);
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      'parentPipeline',
      executionId,
    );
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      'childPipeline',
      executionId,
    );
  });

  it('stops all pipelines when no execution ID is provided', async () => {
    digitalTwin.pipelineId = 123;

    const mockStop = jest.spyOn(digitalTwin, 'stop');
    mockStop.mockResolvedValue(undefined);

    await stopPipelines(digitalTwin);

    expect(mockStop).toHaveBeenCalledTimes(2);
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      'parentPipeline',
    );
    expect(mockStop).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      'childPipeline',
    );
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
