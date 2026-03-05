import {
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  fetchExecutionHistory,
  fetchAllExecutionHistory,
  addExecution,
  updateExecution,
} from 'model/backend/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { setupStore } from './testSetup';

describe('executionHistory slice - async thunks (fetch & write)', () => {
  let store: ReturnType<typeof setupStore>['store'];
  let mockStorageService: ReturnType<typeof setupStore>['mockStorageService'];

  beforeEach(() => {
    ({ store, mockStorageService } = setupStore());
  });

  it('should handle fetchExecutionHistory success', async () => {
    const mockEntries = [
      {
        id: '1',
        dtName: 'test-dt',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
    ];

    mockStorageService.getByDTName.mockResolvedValue(mockEntries);

    await (store.dispatch as (action: unknown) => Promise<void>)(
      fetchExecutionHistory('test-dt'),
    );

    const state = store.getState().executionHistory;
    expect(state.entries).toEqual(mockEntries);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(mockStorageService.getByDTName).toHaveBeenCalledWith('test-dt');
  });

  it('should handle fetchAllExecutionHistory success', async () => {
    const mockEntries = [
      {
        id: '1',
        dtName: 'test-dt-1',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
    ];

    mockStorageService.getAll.mockResolvedValue(mockEntries);

    await (store.dispatch as (action: unknown) => Promise<void>)(
      fetchAllExecutionHistory(),
    );

    const state = store.getState().executionHistory;
    expect(state.entries).toEqual(mockEntries);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(mockStorageService.getAll).toHaveBeenCalled();
  });

  it('should handle addExecution success', async () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    mockStorageService.add.mockResolvedValue('1');

    await (store.dispatch as (action: unknown) => Promise<void>)(
      addExecution(entry),
    );

    const state = store.getState().executionHistory;
    expect(state.entries).toContainEqual(entry);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(mockStorageService.add).toHaveBeenCalledWith(entry);
  });

  it('should handle updateExecution success', async () => {
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

    mockStorageService.update.mockResolvedValue(undefined);

    await (store.dispatch as (action: unknown) => Promise<void>)(
      updateExecution(updatedEntry),
    );

    const state = store.getState().executionHistory;
    expect(state.entries[0]).toEqual(updatedEntry);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(mockStorageService.update).toHaveBeenCalledWith(updatedEntry);
  });

  it('should handle fetchExecutionHistory error', async () => {
    const errorMessage = 'Database error';
    mockStorageService.getByDTName.mockRejectedValue(new Error(errorMessage));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      fetchExecutionHistory('test-dt'),
    );

    const state = store.getState().executionHistory;
    expect(state.loading).toBe(false);
    expect(state.error).toBe(
      `Failed to fetch execution history: Error: ${errorMessage}`,
    );
  });

  it('should handle setExecutionHistoryEntries and clear all entries across DTs', async () => {
    const entryDT1 = {
      id: '1',
      dtName: 'dt1',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    };
    store.dispatch(setExecutionHistoryEntries([entryDT1]));

    const entryDT2 = {
      id: '2',
      dtName: 'dt2',
      pipelineId: 456,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    store.dispatch(setExecutionHistoryEntries([entryDT2]));

    const state = store.getState().executionHistory.entries;
    expect(state.length).toBe(1);
    expect(state[0].id).toBe('2');
  });
});
