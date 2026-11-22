import { setAccessToken, setUsername } from 'src/util/credentials';

export type MockMeasurementState = {
  shouldStopPipelines: boolean;
  activePipelines: unknown[];
  executionResults: unknown[];
  currentMeasurementPromise: Promise<void> | null;
  currentTrialMinPipelineId: number | null;
  currentTrialExecutionIndex: number;
  isRunning: boolean;
  results: unknown[] | null;
  currentTaskIndexUI: number | null;
  componentSetters: Record<string, (...args: unknown[]) => unknown> | null;
};

export function createSetterWrappers(state: MockMeasurementState) {
  return {
    setIsRunning: (v: boolean) => {
      state.isRunning = v;
      state.componentSetters?.setIsRunning(v);
    },
    setCurrentExecutions: (v: unknown[]) => {
      state.componentSetters?.setCurrentExecutions(v);
    },
    setCurrentTaskIndex: (v: number | null) => {
      state.currentTaskIndexUI = v;
      state.componentSetters?.setCurrentTaskIndex(v);
    },
    setResults: (v: unknown) => {
      state.results = typeof v === 'function' ? v(state.results ?? []) : v;
      state.componentSetters?.setResults(v);
    },
  };
}

function createMockState(): MockMeasurementState {
  return {
    shouldStopPipelines: false,
    activePipelines: [],
    executionResults: [],
    currentMeasurementPromise: null,
    currentTrialMinPipelineId: null,
    currentTrialExecutionIndex: 0,
    isRunning: false,
    results: null,
    currentTaskIndexUI: null,
    componentSetters: null,
  };
}

export function createMeasurementExecutionMock(
  extras: Record<string, unknown> = {},
) {
  const actual = jest.requireActual('src/gitlab/measure/measurement.execution');

  const bs = createMockState();

  const createTask = (name: string, desc: string) => ({
    ...actual.DEFAULT_TASK,
    'Task Name': name,
    Description: desc,
    Executions: () => [{ dtName: 'hello-world', config: {} }],
  });

  const tasksArray = [
    createTask('Task 1', 'First'),
    createTask('Task 2', 'Second'),
  ];

  return {
    measurementState: bs,
    saveOriginalSettings: jest.fn(),
    restoreOriginalSettings: jest.fn(),
    attachSetters: jest.fn(
      (s: Record<string, (...args: unknown[]) => unknown>) => {
        bs.componentSetters = s;
      },
    ),
    wrapSetters: () => createSetterWrappers(bs),
    getTasks: () => tasksArray,
    measurementConfig: {
      trials: 3,
      primaryRunnerTag: 'linux',
      secondaryRunnerTag: 'windows',
    },
    resetTasks: jest.fn(() =>
      tasksArray.map((t) => ({
        ...t,
        Trials: [],
        'Time Start': undefined,
        'Time End': undefined,
        'Average Time (s)': undefined,
        Status: 'NOT_STARTED' as const,
      })),
    ),
    DEFAULT_TASK: actual.DEFAULT_TASK,
    clearPersistedResults: jest.fn(),
    setMeasurementStore: jest.fn(),
    getStore: jest.fn(() => ({
      showSnackbar: jest.fn(),
      getState: jest.fn(() => ({ settings: { disabledTaskNames: [] } })),
    })),
    ...extras,
  };
}

export function createPipelineCoreMock() {
  return {
    delay: jest.fn().mockResolvedValue(undefined),
  };
}

export function createStatusCheckingMock() {
  return {
    isFailureStatus: jest.fn(
      (s: string) =>
        s.toLowerCase() === 'failed' || s.toLowerCase() === 'skipped',
    ),
  };
}

export function createTestStorage(items: Record<string, string> = {}) {
  const stored = new Map(Object.entries(items));
  return {
    getItem: jest.fn((key: string) => stored.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      stored.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      stored.delete(key);
    }),
  };
}

export function setupCredentials(token = 'test-token', username = 'test-user') {
  setAccessToken(token);
  setUsername(username);
}

export async function clearDatabase(measurementDBService: {
  getAll: () => Promise<Array<{ id: string }>>;
  delete: (id: string) => Promise<void>;
}) {
  try {
    const entries = await measurementDBService.getAll();
    await Promise.all(
      entries.map((entry) => measurementDBService.delete(entry.id)),
    );
  } catch (error) {
    throw new Error(`Failed to clear database: ${error}`, { cause: error });
  }
}
