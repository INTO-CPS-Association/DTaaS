import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
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

describe('ExecutionStatusManager - parentPipeline', () => {
  const {
    startTime,
    digitalTwin,
    params,
    paramsWithStartTime,
    setButtonText,
    setLogButtonDisabled,
    dispatch,
    pipelineId,
    spyOnGetPipelineJobs,
    spyOnHandleTimeout,
    spyOnGetPipelineStatus,
    spyOnCheckPipelineStatus,
  } = setup;

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts pipeline status check', async () => {
    const checkParentPipelineStatus = jest
      .spyOn(PipelineChecks, 'checkParentPipelineStatus')
      .mockResolvedValue(undefined);

    jest.spyOn(globalThis.Date, 'now').mockReturnValue(startTime);

    spyOnGetPipelineStatus('success');
    spyOnGetPipelineJobs();

    await PipelineChecks.startPipelineStatusCheck(params);

    expect(checkParentPipelineStatus).toHaveBeenCalled();
  });

  it('surfaces a persistent status error and releases the execution UI', async () => {
    jest
      .spyOn(digitalTwin.backend, 'getPipelineStatus')
      .mockRejectedValue(new Error('Forbidden'));

    await PipelineChecks.startPipelineStatusCheck(params);

    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'snackbar/showSnackbar' }),
    );
  });

  it('records a persistent status error in execution history', async () => {
    const executionId = 'test-execution-id';
    (digitalTwin.updateExecutionStatus as jest.Mock).mockResolvedValue(
      undefined,
    );

    await PipelineChecks.handlePipelineCheckError(
      { ...params, executionId },
      new Error('Forbidden'),
    );

    expect(digitalTwin.updateExecutionStatus).toHaveBeenCalledWith(
      executionId,
      ExecutionStatus.ERROR,
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ id: executionId }),
      }),
    );
  });

  it('checks parent pipeline status and returns success', async () => {
    const checkChildPipelineStatus = spyOnCheckPipelineStatus();

    spyOnGetPipelineStatus('success');
    spyOnGetPipelineJobs();

    await PipelineChecks.checkParentPipelineStatus(paramsWithStartTime);

    expect(checkChildPipelineStatus).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns failed', async () => {
    const checkChildPipelineStatus = spyOnCheckPipelineStatus();

    spyOnGetPipelineStatus('failed');
    spyOnGetPipelineJobs();

    await PipelineChecks.checkParentPipelineStatus(paramsWithStartTime);

    expect(checkChildPipelineStatus).toHaveBeenCalled();
  });

  it('checks parent pipeline status and returns timeout', async () => {
    const handleTimeout = spyOnHandleTimeout();

    spyOnGetPipelineStatus('running');
    jest.spyOn(PipelineCore, 'hasTimedOut').mockReturnValue(true);

    await PipelineChecks.checkParentPipelineStatus(paramsWithStartTime);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks parent pipeline status with executionId and retrieves pipelineId from execution history', async () => {
    const executionId = 'test-execution-id';
    const mockExecution = {
      id: executionId,
      pipelineId: 999,
      dtName: 'testName',
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    const getExecutionHistorySpy = jest
      .spyOn(digitalTwin, 'getExecutionHistoryById')
      .mockResolvedValue(mockExecution);
    const checkChildPipelineStatus = spyOnCheckPipelineStatus();
    spyOnGetPipelineStatus('success');
    spyOnGetPipelineJobs();

    await PipelineChecks.checkParentPipelineStatus({
      ...paramsWithStartTime,
      executionId,
    });

    expect(getExecutionHistorySpy).toHaveBeenCalledWith(executionId);
    expect(digitalTwin.backend.getPipelineStatus).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      999,
    );
    expect(checkChildPipelineStatus).toHaveBeenCalled();

    getExecutionHistorySpy.mockRestore();
  });

  it('checks parent pipeline status with executionId and falls back to digitalTwin.pipelineId', async () => {
    const executionId = 'test-execution-id';

    const getExecutionHistorySpy = jest
      .spyOn(digitalTwin, 'getExecutionHistoryById')
      .mockResolvedValue(undefined);
    const checkChildPipelineStatus = spyOnCheckPipelineStatus();
    spyOnGetPipelineStatus('success');
    spyOnGetPipelineJobs();

    digitalTwin.pipelineId = pipelineId;

    await PipelineChecks.checkParentPipelineStatus({
      ...paramsWithStartTime,
      executionId,
    });

    expect(getExecutionHistorySpy).toHaveBeenCalledWith(executionId);
    expect(digitalTwin.backend.getPipelineStatus).toHaveBeenCalledWith(
      digitalTwin.backend.getProjectId(),
      pipelineId,
    );
    expect(checkChildPipelineStatus).toHaveBeenCalled();

    getExecutionHistorySpy.mockRestore();
  });
});
