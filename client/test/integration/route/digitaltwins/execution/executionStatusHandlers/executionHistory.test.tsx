import * as PipelineUtils from 'route/digitaltwins/execution/executionStatusHandlers';
import {
  dispatchAddExecHistoryEntry,
  previewStore,
  previewStore as store,
} from 'test/integration/integration.testUtil';
import { JobSchema } from '@gitbeaker/rest';
import DigitalTwin from 'model/backend/digitalTwin';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import setupDigitalTwinBeforeEach from './testSetup';

describe('PipelineUtils - execution history', () => {
  let digitalTwin: DigitalTwin;

  beforeEach(() => {
    digitalTwin = setupDigitalTwinBeforeEach(store);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts pipeline with valid execution ID and updates state', async () => {
    const mockExecutionId = 'exec-123';
    const mockPipelineId = 456;

    digitalTwin.execute = jest.fn().mockResolvedValue(mockPipelineId);
    digitalTwin.currentExecutionId = mockExecutionId;

    const setLogButtonDisabled = jest.fn();

    const result = await PipelineUtils.startPipeline(
      digitalTwin,
      previewStore.dispatch,
      setLogButtonDisabled,
    );

    expect(result).toBe(mockExecutionId);
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);

    const snackbarItems = previewStore.getState().snackbar.items;
    expect(snackbarItems).toHaveLength(1);
    expect(snackbarItems[0].message).toContain(
      'Execution started successfully',
    );
    expect(snackbarItems[0].message).toContain('MockedDTName');
    expect(snackbarItems[0].severity).toBe('success');

    const executionHistoryState = previewStore.getState().executionHistory;
    expect(executionHistoryState.selectedExecutionId).toBe(mockExecutionId);
  });

  it('updates pipeline state with executionId', async () => {
    const mockExecutionId = 'exec-456';

    await dispatchAddExecHistoryEntry(previewStore, {
      id: mockExecutionId,
      dtName: 'mockedDTName',
      status: ExecutionStatus.TIMEOUT,
    });

    PipelineUtils.updatePipelineState(
      digitalTwin,
      previewStore.dispatch,
      mockExecutionId,
    );

    const digitalTwinState = previewStore.getState().digitalTwin.digitalTwin;
    expect(digitalTwinState.mockedDTName.pipelineCompleted).toBe(false);
    expect(digitalTwinState.mockedDTName.pipelineLoading).toBe(true);

    const executionHistoryState = previewStore.getState().executionHistory;
    const execution = executionHistoryState.entries.find(
      (e) => e.id === mockExecutionId,
    );
    expect(execution?.status).toBe(ExecutionStatus.RUNNING);
  });

  it('updates pipeline state on completion with executionId', async () => {
    const mockExecutionId = 'exec-789';
    const mockJobLogs = [
      { jobName: 'job1', log: 'log1' },
      { jobName: 'job2', log: 'log2' },
    ];

    await dispatchAddExecHistoryEntry(previewStore, {
      id: mockExecutionId,
      dtName: 'mockedDTName',
      status: ExecutionStatus.RUNNING,
    });

    digitalTwin.updateExecutionLogs = jest.fn().mockResolvedValue(undefined);
    digitalTwin.updateExecutionStatus = jest.fn().mockResolvedValue(undefined);

    await PipelineUtils.updatePipelineStateOnCompletion(
      digitalTwin,
      mockJobLogs,
      jest.fn(),
      jest.fn(),
      previewStore.dispatch,
      mockExecutionId,
      ExecutionStatus.COMPLETED,
    );

    expect(digitalTwin.updateExecutionLogs).toHaveBeenCalledWith(
      mockExecutionId,
      mockJobLogs,
    );
    expect(digitalTwin.updateExecutionStatus).toHaveBeenCalledWith(
      mockExecutionId,
      ExecutionStatus.COMPLETED,
    );

    const executionHistoryState = previewStore.getState().executionHistory;
    const execution = executionHistoryState.entries.find(
      (e) => e.id === mockExecutionId,
    );
    expect(execution?.jobLogs).toEqual(mockJobLogs);
    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('handles fetchLogsAndUpdateExecution error gracefully', async () => {
    const mockExecutionId = 'exec-error';
    const mockPipelineId = 999;

    (mockBackendInstance.getPipelineJobs as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    const result = await PipelineUtils.fetchLogsAndUpdateExecution(
      digitalTwin,
      mockPipelineId,
      mockExecutionId,
      ExecutionStatus.FAILED,
      previewStore.dispatch,
    );

    expect(result).toBe(false);
  });

  it('returns false when all logs are empty in fetchLogsAndUpdateExecution', async () => {
    const mockExecutionId = 'exec-empty';
    const mockPipelineId = 888;
    const mockJob = { id: 1, name: 'empty-job' } as JobSchema;

    (mockBackendInstance.getPipelineJobs as jest.Mock).mockResolvedValue([
      mockJob,
    ]);
    (mockBackendInstance.getJobTrace as jest.Mock).mockResolvedValue('   ');

    const result = await PipelineUtils.fetchLogsAndUpdateExecution(
      digitalTwin,
      mockPipelineId,
      mockExecutionId,
      ExecutionStatus.COMPLETED,
      previewStore.dispatch,
    );

    expect(result).toBe(false);
  });

  it('successfully fetches and updates execution with valid logs', async () => {
    const mockExecutionId = 'exec-success';
    const mockPipelineId = 777;
    const mockJob = { id: 1, name: 'success-job' } as JobSchema;

    await dispatchAddExecHistoryEntry(previewStore, {
      id: mockExecutionId,
      dtName: 'mockedDTName',
      status: ExecutionStatus.RUNNING,
    });

    (mockBackendInstance.getPipelineJobs as jest.Mock).mockResolvedValue([
      mockJob,
    ]);
    (mockBackendInstance.getJobTrace as jest.Mock).mockResolvedValue(
      'Valid log content',
    );

    digitalTwin.updateExecutionLogs = jest.fn().mockResolvedValue(undefined);
    digitalTwin.updateExecutionStatus = jest.fn().mockResolvedValue(undefined);

    const result = await PipelineUtils.fetchLogsAndUpdateExecution(
      digitalTwin,
      mockPipelineId,
      mockExecutionId,
      ExecutionStatus.COMPLETED,
      previewStore.dispatch,
    );

    expect(result).toBe(true);
    expect(digitalTwin.updateExecutionLogs).toHaveBeenCalledWith(
      mockExecutionId,
      [{ jobName: 'success-job', log: 'Valid log content' }],
    );
    expect(digitalTwin.updateExecutionStatus).toHaveBeenCalledWith(
      mockExecutionId,
      ExecutionStatus.COMPLETED,
    );
  });
});
