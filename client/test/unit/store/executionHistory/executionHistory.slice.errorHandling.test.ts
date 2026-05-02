import {
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  removeExecution,
  addExecution,
  updateExecution,
  clearExecutionHistoryForDT,
  checkRunningExecutions,
} from 'model/backend/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import ExecutionStatusService from 'model/backend/state/ExecutionStatusService';
import { setupStore } from './testSetup';

jest.mock('model/backend/state/ExecutionStatusService', () => ({
  __esModule: true,
  default: { checkRunningExecutions: jest.fn() },
}));

describe('executionHistory slice - error handling', () => {
  let store: ReturnType<typeof setupStore>['store'];
  let mockStorageService: ReturnType<typeof setupStore>['mockStorageService'];

  beforeEach(() => {
    ({ store, mockStorageService } = setupStore());
  });

  it('should handle removeExecution when execution does not exist', async () => {
    await (store.dispatch as (action: unknown) => Promise<void>)(
      removeExecution('non-existent-id'),
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store.getState().executionHistory;
    expect(mockStorageService.delete).not.toHaveBeenCalled();
  });

  it('should handle addExecution error', async () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    const errorMessage = 'Add failed';
    mockStorageService.add.mockRejectedValue(new Error(errorMessage));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      addExecution(entry),
    );

    const state = store.getState().executionHistory;
    expect(state.loading).toBe(false);
    expect(state.error).toBe(`Failed to add execution: Error: ${errorMessage}`);
  });

  it('should handle updateExecution error', async () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    store.dispatch(addExecutionHistoryEntry(entry));

    const updatedEntry = {
      ...entry,
      status: ExecutionStatus.COMPLETED,
    };

    const errorMessage = 'Update failed';
    mockStorageService.update.mockRejectedValue(new Error(errorMessage));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      updateExecution(updatedEntry),
    );

    const state = store.getState().executionHistory;
    expect(state.loading).toBe(false);
    expect(state.error).toBe(
      `Failed to update execution: Error: ${errorMessage}`,
    );
  });

  it('should handle clearExecutionHistoryForDT error', async () => {
    const entries = [
      {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
    ];

    store.dispatch(setExecutionHistoryEntries(entries));

    const errorMessage = 'Delete failed';
    mockStorageService.delete.mockRejectedValue(new Error(errorMessage));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      clearExecutionHistoryForDT('test-dt'),
    );

    const state = store.getState().executionHistory;
    expect(state.error).toBe(
      `Failed to clear execution history: Error: ${errorMessage}`,
    );
  });

  it('should handle checkRunningExecutions error', async () => {
    const entries = [
      {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    store.dispatch(setExecutionHistoryEntries(entries));

    const errorMessage = 'Check status failed';
    jest
      .spyOn(ExecutionStatusService, 'checkRunningExecutions')
      .mockRejectedValue(new Error(errorMessage));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      checkRunningExecutions(),
    );

    const state = store.getState().executionHistory;
    expect(state.error).toBe(
      `Failed to check execution status: Error: ${errorMessage}`,
    );
  });
});
