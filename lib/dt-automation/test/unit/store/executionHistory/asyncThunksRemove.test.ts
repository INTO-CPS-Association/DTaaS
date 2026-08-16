import {
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  removeExecution,
  clearExecutionHistoryForDT,
  checkRunningExecutions,
} from 'model/backend/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { setupStore, createMockDTExecutionResult } from './testSetup';

describe('executionHistory slice - async thunks (remove & clear)', () => {
  let store: ReturnType<typeof setupStore>['store'];
  let mockStorageService: ReturnType<typeof setupStore>['mockStorageService'];

  beforeEach(() => {
    ({ store, mockStorageService } = setupStore());
  });

  it('should handle clearExecutionHistoryForDT success', async () => {
    const entries = [
      createMockDTExecutionResult(
        '1',
        'test-dt',
        123,
        ExecutionStatus.COMPLETED,
      ),
      createMockDTExecutionResult(
        '2',
        'other-dt',
        456,
        ExecutionStatus.RUNNING,
      ),
    ];

    store.dispatch(setExecutionHistoryEntries(entries));
    mockStorageService.delete.mockResolvedValue(undefined);

    await (store.dispatch as (action: unknown) => Promise<void>)(
      clearExecutionHistoryForDT('test-dt'),
    );

    const state = store.getState().executionHistory;
    expect(state.entries.length).toBe(1);
    expect(state.entries[0].dtName).toBe('other-dt');
    expect(state.error).toBeNull();
    expect(mockStorageService.delete).toHaveBeenCalledWith('1');
  });

  it('should not clear active (running) pipelines', async () => {
    const entries = [
      createMockDTExecutionResult(
        '1',
        'test-dt',
        123,
        ExecutionStatus.COMPLETED,
      ),
      createMockDTExecutionResult('2', 'test-dt', 456, ExecutionStatus.RUNNING),
    ];

    store.dispatch(setExecutionHistoryEntries(entries));
    mockStorageService.delete.mockResolvedValue(undefined);

    await (store.dispatch as (action: unknown) => Promise<void>)(
      clearExecutionHistoryForDT('test-dt'),
    );

    const state = store.getState().executionHistory;
    expect(state.entries.length).toBe(1);
    expect(state.entries[0].id).toBe('2');
    expect(state.entries[0].status).toBe(ExecutionStatus.RUNNING);
    expect(mockStorageService.delete).toHaveBeenCalledWith('1');
    expect(mockStorageService.delete).not.toHaveBeenCalledWith('2');
  });

  it('should not delete anything when all entries are running', async () => {
    const entries = [
      createMockDTExecutionResult('1', 'test-dt', 123, ExecutionStatus.RUNNING),
    ];

    store.dispatch(setExecutionHistoryEntries(entries));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      clearExecutionHistoryForDT('test-dt'),
    );

    const state = store.getState().executionHistory;
    expect(state.entries.length).toBe(1);
    expect(mockStorageService.delete).not.toHaveBeenCalled();
  });

  it('should handle checkRunningExecutions with no running executions', async () => {
    const entries = [
      createMockDTExecutionResult(
        '1',
        'test-dt',
        123,
        ExecutionStatus.COMPLETED,
      ),
    ];

    store.dispatch(setExecutionHistoryEntries(entries));

    await (store.dispatch as (action: unknown) => Promise<void>)(
      checkRunningExecutions(),
    );

    const state = store.getState().executionHistory;
    expect(state.entries).toEqual(entries);
  });

  it('should handle removeExecution success', async () => {
    store.dispatch(
      addExecutionHistoryEntry(
        createMockDTExecutionResult(
          '1',
          'test-dt',
          123,
          ExecutionStatus.COMPLETED,
        ),
      ),
    );
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
    store.dispatch(
      addExecutionHistoryEntry(
        createMockDTExecutionResult(
          '1',
          'test-dt',
          123,
          ExecutionStatus.COMPLETED,
        ),
      ),
    );
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
