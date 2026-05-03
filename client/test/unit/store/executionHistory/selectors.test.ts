import {
  setExecutionHistoryEntries,
  setSelectedExecutionId,
  setLoading,
  setError,
} from 'model/backend/state/executionHistory.slice';
import {
  selectExecutionHistoryEntries,
  selectExecutionHistoryByDTName,
  selectExecutionHistoryById,
  selectSelectedExecutionId,
  selectSelectedExecution,
  selectExecutionHistoryLoading,
  selectExecutionHistoryError,
} from 'model/backend/state/executionHistory.selectors';
import { RootState } from 'store/store';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { setupStore, createMockDTExecutionResult } from './testSetup';

describe('executionHistory slice - selectors', () => {
  let store: ReturnType<typeof setupStore>['store'];

  beforeEach(() => {
    ({ store } = setupStore());

    const entries = [
      createMockDTExecutionResult('1', 'dt1', 123, ExecutionStatus.COMPLETED),
      createMockDTExecutionResult('2', 'dt2', 456, ExecutionStatus.RUNNING),
      createMockDTExecutionResult('3', 'dt1', 789, ExecutionStatus.FAILED),
    ];
    store.dispatch(setExecutionHistoryEntries(entries));
    store.dispatch(setSelectedExecutionId('2'));
    store.dispatch(setLoading(true));
    store.dispatch(setError('Test error'));
  });

  it('should select all execution history entries', () => {
    const entries = selectExecutionHistoryEntries(
      store.getState() as unknown as RootState,
    );
    expect(entries.length).toBe(3);
  });

  it('should select execution history by DT name', () => {
    const dt1Entries = selectExecutionHistoryByDTName('dt1')(
      store.getState() as unknown as RootState,
    );
    expect(dt1Entries.length).toBe(2);
    expect(dt1Entries.every((e) => e.dtName === 'dt1')).toBe(true);
  });

  it('should select execution history by ID', () => {
    const entry = selectExecutionHistoryById('2')(
      store.getState() as unknown as RootState,
    );
    expect(entry?.id).toBe('2');
    expect(entry?.dtName).toBe('dt2');
  });

  it('should select selected execution ID', () => {
    const selectedId = selectSelectedExecutionId(
      store.getState() as unknown as RootState,
    );
    expect(selectedId).toBe('2');
  });

  it('should select selected execution', () => {
    const selectedExecution = selectSelectedExecution(
      store.getState() as unknown as RootState,
    );
    expect(selectedExecution?.id).toBe('2');
    expect(selectedExecution?.dtName).toBe('dt2');
  });

  it('should select loading state', () => {
    const loading = selectExecutionHistoryLoading(
      store.getState() as unknown as RootState,
    );
    expect(loading).toBe(true);
  });

  it('should select error state', () => {
    const error = selectExecutionHistoryError(
      store.getState() as unknown as RootState,
    );
    expect(error).toBe('Test error');
  });
});
