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
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/measurement.execution',
  );

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
    getChildPipelineId: jest.fn((id: number) => id + 1),
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

export function setupSessionStorage() {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
}

export function setupSessionStorageAuth(
  token = 'test-token',
  username = 'test-user',
) {
  (sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
    if (key === 'access_token') return token;
    if (key === 'username') return username;
    return null;
  });
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
    throw new Error(`Failed to clear database: ${error}`);
  }
}

export function setupMockDownload() {
  const mockClick = jest.fn();
  const mockLink = { href: '', download: '', click: mockClick };
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);

  (URL as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
    jest.fn().mockReturnValue('blob:test-url');
  (URL as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL =
    jest.fn();

  jest
    .spyOn(document, 'createElement')
    .mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    });

  return {
    mockClick,
    mockLink,
    restore: () => {
      (URL as { createObjectURL: typeof URL.createObjectURL }).createObjectURL =
        originalCreateObjectURL;
      (URL as { revokeObjectURL: typeof URL.revokeObjectURL }).revokeObjectURL =
        originalRevokeObjectURL;
      jest.restoreAllMocks();
    },
  };
}
