import {
  setLoading,
  setError,
  setExecutionHistoryEntries,
  setExecutionHistoryEntriesForDT,
  addExecutionHistoryEntry,
  updateExecutionHistoryEntry,
  updateExecutionStatus,
  updateExecutionLogs,
} from 'model/backend/state/executionHistory.slice';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { setupStore } from './testSetup';

describe('executionHistory slice - reducers (basic)', () => {
  let store: ReturnType<typeof setupStore>['store'];

  beforeEach(() => {
    ({ store } = setupStore());
  });

  it('should handle setLoading', () => {
    store.dispatch(setLoading(true));
    expect(store.getState().executionHistory.loading).toBe(true);

    store.dispatch(setLoading(false));
    expect(store.getState().executionHistory.loading).toBe(false);
  });

  it('should handle setError', () => {
    const errorMessage = 'Test error message';
    store.dispatch(setError(errorMessage));
    expect(store.getState().executionHistory.error).toBe(errorMessage);

    store.dispatch(setError(null));
    expect(store.getState().executionHistory.error).toBeNull();
  });

  it('should handle setExecutionHistoryEntries', () => {
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
        dtName: 'test-dt',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    store.dispatch(setExecutionHistoryEntries(entries));
    expect(store.getState().executionHistory.entries).toEqual(entries);
  });

  it('should replace entries when using setExecutionHistoryEntries', () => {
    const entriesDT1 = [
      {
        id: '1',
        dtName: 'digital-twin-1',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
      {
        id: '2',
        dtName: 'digital-twin-1',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    store.dispatch(setExecutionHistoryEntries(entriesDT1));
    expect(store.getState().executionHistory.entries.length).toBe(2);

    const entriesDT2 = [
      {
        id: '3',
        dtName: 'digital-twin-2',
        pipelineId: 789,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    store.dispatch(setExecutionHistoryEntries(entriesDT2));

    const stateEntries = store.getState().executionHistory.entries;
    expect(stateEntries.length).toBe(1);
    expect(stateEntries).toEqual(entriesDT2);
    expect(
      stateEntries.find((e: DTExecutionResult) => e.id === '1'),
    ).toBeUndefined();
    expect(
      stateEntries.find((e: DTExecutionResult) => e.id === '2'),
    ).toBeUndefined();
    expect(
      stateEntries.find((e: DTExecutionResult) => e.id === '3'),
    ).toBeDefined();
  });

  it('should handle addExecutionHistoryEntry', () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    store.dispatch(addExecutionHistoryEntry(entry));
    expect(store.getState().executionHistory.entries).toEqual([entry]);
  });

  it('should handle updateExecutionHistoryEntry', () => {
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
      jobLogs: [{ jobName: 'test-job', log: 'test log' }],
    };

    store.dispatch(updateExecutionHistoryEntry(updatedEntry));
    expect(store.getState().executionHistory.entries).toEqual([updatedEntry]);
  });

  it('should handle updateExecutionStatus', () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    store.dispatch(addExecutionHistoryEntry(entry));
    store.dispatch(
      updateExecutionStatus({ id: '1', status: ExecutionStatus.COMPLETED }),
    );

    const updatedEntry = store
      .getState()
      .executionHistory.entries.find((e: DTExecutionResult) => e.id === '1');
    expect(updatedEntry?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('should handle updateExecutionLogs', () => {
    const entry = {
      id: '1',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    store.dispatch(addExecutionHistoryEntry(entry));

    const logs = [{ jobName: 'test-job', log: 'test log' }];
    store.dispatch(updateExecutionLogs({ id: '1', logs }));

    const updatedEntry = store
      .getState()
      .executionHistory.entries.find((e: DTExecutionResult) => e.id === '1');
    expect(updatedEntry?.jobLogs).toEqual(logs);
  });

  it('should handle setExecutionHistoryEntriesForDT', () => {
    const initialEntries = [
      {
        id: '1',
        dtName: 'dt1',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
      {
        id: '2',
        dtName: 'dt2',
        pipelineId: 456,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];
    store.dispatch(setExecutionHistoryEntries(initialEntries));

    const newEntriesForDT1 = [
      {
        id: '3',
        dtName: 'dt1',
        pipelineId: 789,
        timestamp: Date.now(),
        status: ExecutionStatus.FAILED,
        jobLogs: [],
      },
    ];

    store.dispatch(
      setExecutionHistoryEntriesForDT({
        dtName: 'dt1',
        entries: newEntriesForDT1,
      }),
    );

    const state = store.getState().executionHistory.entries;
    expect(state.length).toBe(2);
    expect(state.find((e) => e.id === '1')).toBeUndefined();
    expect(state.find((e) => e.id === '2')).toBeDefined();
    expect(state.find((e) => e.id === '3')).toBeDefined();
  });
});
