import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import * as PipelineUtils from 'route/digitaltwins/execution/executionStatusHandlers';
import * as PipelineCore from 'model/backend/gitlab/execution/pipelineCore';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { createExecutionStatusManagerSetup } from './testSetup';

jest.mock('model/backend/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

jest.mock('route/digitaltwins/execution/executionStatusHandlers', () => ({
  ...jest.requireActual('route/digitaltwins/execution/executionStatusHandlers'),
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
}));

jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  delay: jest.fn(),
  hasTimedOut: jest.fn(),
  getPollingInterval: jest.fn(() => 5000),
}));

jest.useFakeTimers();

const setup = createExecutionStatusManagerSetup();

describe('ExecutionStatusManager - childPipeline', () => {
  const {
    setButtonText,
    setLogButtonDisabled,
    dispatch,
    digitalTwin,
    paramsWithStartTime,
    pipelineId,
    spyOnGetPipelineJobs,
    spyOnHandleTimeout,
    spyOnGetPipelineStatus,
  } = setup;

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles pipeline completion with failed status', async () => {
    spyOnGetPipelineJobs();

    const mockFetchJobLogs = jest.spyOn(PipelineUtils, 'fetchJobLogs');
    mockFetchJobLogs.mockResolvedValue([]);

    await PipelineChecks.handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      'failed',
    );

    expect(dispatch).toHaveBeenCalled();
  });

  it('handles pipeline completion with executionId and updates execution when logs not updated', async () => {
    const executionId = 'test-execution-id';

    spyOnGetPipelineJobs();

    const mockFetchLogsAndUpdateExecution = jest.fn().mockResolvedValue(false);
    const updateExecutionStatusSpy = jest
      .spyOn(digitalTwin, 'updateExecutionStatus')
      .mockResolvedValue(undefined);

    jest.doMock('route/digitaltwins/execution/executionStatusHandlers', () => ({
      fetchLogsAndUpdateExecution: mockFetchLogsAndUpdateExecution,
    }));

    await PipelineChecks.handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      'success',
      executionId,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setPipelineCompleted'),
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('setPipelineLoading'),
      }),
    );

    updateExecutionStatusSpy.mockRestore();
    jest.dontMock('route/digitaltwins/execution/executionStatusHandlers');
  });

  it('checks child pipeline status and returns timeout', async () => {
    const handleTimeout = spyOnHandleTimeout();
    spyOnGetPipelineStatus('running');
    jest.spyOn(PipelineCore, 'hasTimedOut').mockReturnValue(true);

    await PipelineChecks.checkChildPipelineStatus(paramsWithStartTime);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks child pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineCore, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    const getPipelineStatusMock = jest.spyOn(
      digitalTwin.backend,
      'getPipelineStatus',
    );
    getPipelineStatusMock
      .mockResolvedValueOnce('running')
      .mockResolvedValue('success');

    spyOnGetPipelineJobs();

    jest
      .spyOn(PipelineCore, 'hasTimedOut')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await PipelineChecks.checkChildPipelineStatus(paramsWithStartTime);

    expect(getPipelineStatusMock).toHaveBeenCalled();
  });

  it('checks child pipeline status with executionId and calculates child pipelineId', async () => {
    const executionId = 'test-execution-id';
    const mockExecution = {
      id: executionId,
      pipelineId: 500,
      dtName: 'testName',
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    const getExecutionHistorySpy = jest
      .spyOn(digitalTwin, 'getExecutionHistoryById')
      .mockResolvedValue(mockExecution);
    spyOnGetPipelineStatus('success');
    spyOnGetPipelineJobs();

    const handlePipelineCompletionSpy = jest
      .spyOn(PipelineChecks, 'handlePipelineCompletion')
      .mockResolvedValue(undefined);

    await PipelineChecks.checkChildPipelineStatus({
      ...paramsWithStartTime,
      executionId,
    });

    expect(getExecutionHistorySpy).toHaveBeenCalledWith(executionId);
    expect(digitalTwin.backend.getPipelineStatus).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      501, // execution.pipelineId + 1
    );
    expect(handlePipelineCompletionSpy).toHaveBeenCalled();

    getExecutionHistorySpy.mockRestore();
    handlePipelineCompletionSpy.mockRestore();
  });

  it('checks child pipeline status with executionId and falls back when execution is null', async () => {
    const executionId = 'test-execution-id';

    const getExecutionHistorySpy = jest
      .spyOn(digitalTwin, 'getExecutionHistoryById')
      .mockResolvedValue(undefined);
    spyOnGetPipelineStatus('success');
    spyOnGetPipelineJobs();

    const handlePipelineCompletionSpy = jest
      .spyOn(PipelineChecks, 'handlePipelineCompletion')
      .mockResolvedValue(undefined);

    digitalTwin.pipelineId = 100;

    await PipelineChecks.checkChildPipelineStatus({
      ...paramsWithStartTime,
      executionId,
    });

    expect(getExecutionHistorySpy).toHaveBeenCalledWith(executionId);
    expect(digitalTwin.backend.getPipelineStatus).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      101, // digitalTwin.pipelineId + 1
    );
    expect(handlePipelineCompletionSpy).toHaveBeenCalled();

    getExecutionHistorySpy.mockRestore();
    handlePipelineCompletionSpy.mockRestore();
  });
});
