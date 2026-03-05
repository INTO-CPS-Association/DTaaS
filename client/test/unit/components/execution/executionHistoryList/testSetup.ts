import { act } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import digitalTwinReducer, {
  DigitalTwinData,
} from 'model/backend/state/digitalTwin.slice';
import executionHistoryReducer from 'model/backend/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { useDispatch, useSelector } from 'react-redux';

export const mockExecutions: DTExecutionResult[] = [
  {
    id: 'exec1',
    dtName: 'test-dt',
    pipelineId: 1001,
    timestamp: 1620000000000,
    status: ExecutionStatus.COMPLETED,
    jobLogs: [],
  },
  {
    id: 'exec2',
    dtName: 'test-dt',
    pipelineId: 1002,
    timestamp: 1620100000000,
    status: ExecutionStatus.FAILED,
    jobLogs: [],
  },
  {
    id: 'exec3',
    dtName: 'test-dt',
    pipelineId: 1003,
    timestamp: 1620200000000,
    status: ExecutionStatus.RUNNING,
    jobLogs: [],
  },
  {
    id: 'exec4',
    dtName: 'test-dt',
    pipelineId: 1004,
    timestamp: 1620300000000,
    status: ExecutionStatus.CANCELED,
    jobLogs: [],
  },
  {
    id: 'exec5',
    dtName: 'test-dt',
    pipelineId: 1005,
    timestamp: 1620400000000,
    status: ExecutionStatus.TIMEOUT,
    jobLogs: [],
  },
];

interface TestState {
  executionHistory: {
    entries: DTExecutionResult[];
    selectedExecutionId: string | null;
    loading: boolean;
    error: string | null;
  };
  digitalTwin: {
    digitalTwin: { [key: string]: DigitalTwinData };
    shouldFetchDigitalTwins: boolean;
  };
}

export type TestStore = ReturnType<typeof configureStore> & {
  getState: () => TestState;
};

export const createTestStore = (
  initialEntries: DTExecutionResult[] = [],
  loading = false,
  error: string | null = null,
): TestStore => {
  const digitalTwinData: DigitalTwinData = {
    DTName: 'test-dt',
    description: 'Test Digital Twin Description',
    fullDescription: 'Test README',
    jobLogs: [],
    pipelineCompleted: false,
    pipelineLoading: false,
    pipelineId: undefined,
    currentExecutionId: undefined,
    lastExecutionStatus: undefined,
    gitlabProjectId: 123,
  };

  return configureStore({
    reducer: {
      executionHistory: executionHistoryReducer,
      digitalTwin: digitalTwinReducer,
    },
    preloadedState: {
      executionHistory: {
        entries: initialEntries,
        loading,
        error,
        selectedExecutionId: null,
      },
      digitalTwin: {
        digitalTwin: { 'test-dt': digitalTwinData },
        shouldFetchDigitalTwins: false,
      },
    },
  });
};

export const waitForAccordionTransitions = async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 300);
    });
  });
};

export interface ExecutionHistoryListContext {
  dtName: string;
  mockOnViewLogs: jest.Mock;
  mockDispatch: jest.Mock;
  testStore: TestStore;
}

export const createExecutionHistoryListContext =
  (): ExecutionHistoryListContext => ({
    dtName: 'test-dt',
    mockOnViewLogs: jest.fn(),
    mockDispatch: jest.fn(),
    testStore: createTestStore(),
  });

export const setupBeforeEach = (ctx: ExecutionHistoryListContext): void => {
  (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
    ctx.mockDispatch,
  );
  ctx.testStore = createTestStore();
  (useSelector as jest.MockedFunction<typeof useSelector>).mockReset();
};

export const teardownAfterEach = async (
  ctx: ExecutionHistoryListContext,
): Promise<void> => {
  ctx.mockOnViewLogs.mockClear();
  ctx.testStore = createTestStore([]);
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

export const useSelectorFromStore = (
  ctx: ExecutionHistoryListContext,
): void => {
  (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
    (selector) => selector(ctx.testStore.getState()),
  );
};
