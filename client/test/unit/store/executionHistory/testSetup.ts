import executionHistoryReducer, {
  setStorageService,
} from 'model/backend/state/executionHistory.slice';
import { configureStore } from '@reduxjs/toolkit';
import { IExecutionHistoryStorage } from 'model/backend/interfaces/sharedInterfaces';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

export const createMockStorageService =
  (): jest.Mocked<IExecutionHistoryStorage> => ({
    init: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue('mock-id'),
    update: jest.fn().mockResolvedValue(undefined),
    getById: jest.fn().mockResolvedValue(null),
    getByDTName: jest.fn().mockResolvedValue([]),
    getAll: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteByDTName: jest.fn().mockResolvedValue(undefined),
  });

export const createTestStore = () =>
  configureStore({
    reducer: {
      executionHistory: executionHistoryReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'executionHistory/addExecutionHistoryEntry',
            'executionHistory/updateExecutionHistoryEntry',
            'executionHistory/setExecutionHistoryEntries',
            'executionHistory/updateExecutionLogs',
            'executionHistory/updateExecutionStatus',
            'executionHistory/setLoading',
            'executionHistory/setError',
            'executionHistory/setSelectedExecutionId',
          ],
        },
      }),
  });

export type TestStore = ReturnType<typeof createTestStore>;

export const createMockEntry = (
  id: string,
  dtName: string,
  pipelineId: number,
  status: ExecutionStatus,
): DTExecutionResult => ({
  id,
  dtName,
  pipelineId,
  timestamp: Date.now(),
  status,
  jobLogs: [],
});

export const setupStore = () => {
  const store = createTestStore();
  const mockStorageService = createMockStorageService();
  setStorageService(mockStorageService);
  return { store, mockStorageService };
};
