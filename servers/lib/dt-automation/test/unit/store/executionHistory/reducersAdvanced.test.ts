import {
  setExecutionHistoryEntries,
  addExecutionHistoryEntry,
  removeExecutionHistoryEntry,
  removeEntriesForDT,
  setSelectedExecutionId,
  clearEntries,
} from 'model/backend/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { setupStore, createMockDTExecutionResult } from './testSetup';

describe('executionHistory slice - reducers (advanced)', () => {
  let store: ReturnType<typeof setupStore>['store'];

  beforeEach(() => {
    ({ store } = setupStore());
  });

  it('should handle removeExecutionHistoryEntry', () => {
    const entry1 = createMockDTExecutionResult(
      '1',
      'test-dt',
      123,
      ExecutionStatus.COMPLETED,
    );
    const entry2 = createMockDTExecutionResult(
      '2',
      'test-dt',
      456,
      ExecutionStatus.RUNNING,
    );

    store.dispatch(setExecutionHistoryEntries([entry1, entry2]));
    store.dispatch(removeExecutionHistoryEntry('1'));

    expect(store.getState().executionHistory.entries).toEqual([entry2]);
  });

  it('should handle removeEntriesForDT', () => {
    const entries = [
      createMockDTExecutionResult('1', 'dt1', 123, ExecutionStatus.COMPLETED),
      createMockDTExecutionResult('2', 'dt2', 456, ExecutionStatus.RUNNING),
      createMockDTExecutionResult('3', 'dt1', 789, ExecutionStatus.FAILED),
    ];

    store.dispatch(setExecutionHistoryEntries(entries));
    store.dispatch(removeEntriesForDT('dt1'));

    const state = store.getState().executionHistory.entries;
    expect(state.length).toBe(1);
    expect(state).toEqual([entries[1]]);
    expect(state.find((e) => e.dtName === 'dt1')).toBeUndefined();
  });

  it('should handle setSelectedExecutionId', () => {
    store.dispatch(setSelectedExecutionId('1'));
    expect(store.getState().executionHistory.selectedExecutionId).toBe('1');

    store.dispatch(setSelectedExecutionId(null));
    expect(store.getState().executionHistory.selectedExecutionId).toBeNull();
  });

  it('should handle clearEntries', () => {
    const entries = [
      createMockDTExecutionResult(
        '1',
        'test-dt',
        123,
        ExecutionStatus.COMPLETED,
      ),
    ];

    store.dispatch(setExecutionHistoryEntries(entries));
    expect(store.getState().executionHistory.entries.length).toBe(1);

    store.dispatch(clearEntries());
    expect(store.getState().executionHistory.entries).toEqual([]);
  });

  it('should not remove entries when id does not match in removeExecutionHistoryEntry', () => {
    const entry1 = createMockDTExecutionResult(
      '1',
      'test-dt',
      123,
      ExecutionStatus.COMPLETED,
    );

    store.dispatch(addExecutionHistoryEntry(entry1));
    store.dispatch(removeExecutionHistoryEntry('non-existent-id'));

    expect(store.getState().executionHistory.entries).toEqual([entry1]);
  });
});
