import {
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  removeExecution,
  clearExecutionHistoryForDT,
  checkRunningExecutions,
} from 'model/backend/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { setupStore } from './testSetup';

describe('executionHistory slice - async thunks (remove & clear)', () => {
  let store: ReturnType<typeof setupStore>['store'];
  let mockStorageService: ReturnType<typeof setupStore>['mockStorageService'];

  beforeEach(() => {
    ({ store, mockStorageService } = setupStore());
  });

  it('should handle clearExecutionHistoryForDT success', async () => {
    const entries = [
      {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
      {
        id: '2',
        dtName: 'other-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    store.dispatch(setExecutionHistoryEntries(entries));
    mockStorageService.deleteByDTName.mockResolvedValue(undefined);

    await (store.dispatch as (action: unknown) => Promise<void>)(
      clearExecutionHistoryForDT('test-dt'),
    );

    const state = store.getState().executionHistory;
    expect(state.entries.length).toBe(1);
    expect(state.entries[0].dtName).toBe('other-dt');
    expect(state.error).toBeNull();
    expect(mockStorageService.deleteByDTName).toHaveBeenCalledWith('test-dt');
  });

  it('should handle checkRunningExecutions with no running executions', async () => {
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

    await (store.dispatch as (action: unknown) => Promise<void>)(
      checkRunningExecutions(),
    );

    const state = store.getState().executionHistory;
    expect(state.entries).toEqual(entries);
  });

  it('should handle removeExecution success', async () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    };

    store.dispatch(addExecutionHistoryEntry(entry));
    mockStorageService.delete.mockResolvedValue(undefined);

    await (store.dispatch as (action: unknown) => Promise<void>)(
      removeExecution('1'),
    );

    const state = store.getState().executionHistory;
    expect(state.entries.find((e) => e.id === '1')).toBeUndefined();
    expect(state.error).toBeNull();
    expect(mockStorageService.delete).toHaveBeenCalledWith('1');
  });

  it('should handle removeExecution error', async () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    };

    store.dispatch(addExecutionHistoryEntry(entry));
    const errorMessage = 'Delete failed';
    mockStorageService.delete.mockRejectedValue(new Error(errorMessage));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      removeExecution('1'),
    );

    const state = store.getState().executionHistory;
    expect(state.entries.find((e) => e.id === '1')).toBeDefined();
    expect(state.error).toBe(
      `Failed to remove execution: Error: ${errorMessage}`,
    );
  });
});
