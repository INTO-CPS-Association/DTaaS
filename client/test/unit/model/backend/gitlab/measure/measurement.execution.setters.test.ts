import {
  measurementState,
  wrapSetters,
  attachSetters,
  detachSetters,
  getTasks,
  resetTasks,
  measurementConfig,
  TimedTask,
  setMeasurementStore,
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  createMockStoreState,
  createMockSetters,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';
import { setupSessionStorage } from 'test/unit/model/backend/gitlab/measure/measurement.envSetup';

jest.mock('util/envUtil', () => ({
  getAuthority: jest.fn(),
}));

describe('measurement.execution - setters and tasks', () => {
  const mockGetState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    measurementState.shouldStopPipelines = false;
    measurementState.activePipelines = [];
    measurementState.executionResults = [];
    measurementState.currentMeasurementPromise = null;
    measurementState.currentTrialMinPipelineId = null;

    setupSessionStorage();

    mockGetState.mockReturnValue(
      createMockStoreState({
        RUNNER_TAG: 'linux',
        BRANCH_NAME: 'main',
      }),
    );
    setMeasurementStore({
      getState: mockGetState,
      restoreRunnerTag: jest.fn(),
      restoreBranchName: jest.fn(),
      restoreSecondaryRunnerTag: jest.fn(),
      showSnackbar: jest.fn(),
    });
  });

  describe('wrapSetters', () => {
    let wrapped: ReturnType<typeof wrapSetters>;

    beforeEach(() => {
      measurementState.isRunning = false;
      measurementState.currentTaskIndexUI = null;
      measurementState.results = null;
      measurementState.componentSetters = null;
      wrapped = wrapSetters();
    });

    it('setIsRunning updates measurementState.isRunning and calls componentSetters', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      measurementState.componentSetters = mockSetters;

      wrapped.setIsRunning(true);

      expect(measurementState.isRunning).toBe(true);
      expect(mockSetters.setIsRunning).toHaveBeenCalledWith(true);
    });

    it('setCurrentTaskIndex updates measurementState.currentTaskIndexUI and calls componentSetters', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      measurementState.componentSetters = mockSetters;

      wrapped.setCurrentTaskIndex(2);

      expect(measurementState.currentTaskIndexUI).toBe(2);
      expect(mockSetters.setCurrentTaskIndex).toHaveBeenCalledWith(2);
    });

    it('setResults with direct value updates measurementState.results', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      measurementState.componentSetters = mockSetters;

      const tasks: TimedTask[] = [
        {
          'Task Name': 'T1',
          Description: 'desc',
          Trials: [],
          'Time Start': undefined,
          'Time End': undefined,
          'Average Time (s)': undefined,
          Status: 'NOT_STARTED',
        },
      ];

      wrapped.setResults(tasks);

      expect(measurementState.results).toEqual(tasks);
      expect(mockSetters.setResults).toHaveBeenCalledWith(tasks);
    });

    it('setResults with function updater applies updater to current results', () => {
      measurementState.results = [];

      const updater = (prev: TimedTask[]) => [
        ...prev,
        {
          'Task Name': 'New',
          Description: 'new',
          Trials: [],
          'Time Start': undefined,
          'Time End': undefined,
          'Average Time (s)': undefined,
          Status: 'NOT_STARTED' as const,
        },
      ];

      wrapped.setResults(updater);

      expect(measurementState.results).toHaveLength(1);
      expect(measurementState.results[0]['Task Name']).toBe('New');
    });

    it('methods work without componentSetters (no error thrown)', () => {
      measurementState.componentSetters = null;

      expect(() => wrapped.setIsRunning(true)).not.toThrow();
      expect(() => wrapped.setCurrentExecutions([])).not.toThrow();
      expect(() => wrapped.setCurrentTaskIndex(0)).not.toThrow();
      expect(() => wrapped.setResults([])).not.toThrow();
    });
  });

  describe('attachSetters / detachSetters', () => {
    it('attachSetters sets componentSetters on measurementState', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);

      attachSetters(mockSetters);

      expect(measurementState.componentSetters).toBe(mockSetters);
    });

    it('detachSetters clears componentSetters on measurementState', () => {
      const resultsRef = { current: [] as TimedTask[] };
      const mockSetters = createMockSetters(resultsRef);
      measurementState.componentSetters = mockSetters;

      detachSetters();

      expect(measurementState.componentSetters).toBeNull();
    });
  });

  describe('getTasks / resetTasks', () => {
    it('getTasks returns an array of tasks', () => {
      const tasks = getTasks();

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]).toHaveProperty('Task Name');
      expect(tasks[0]).toHaveProperty('Description');
      expect(tasks[0]).toHaveProperty('Status');
    });

    it('resetTasks returns tasks with NOT_STARTED status', () => {
      const reset = resetTasks();

      expect(reset.length).toBeGreaterThan(0);
      reset.forEach((task) => {
        expect(task.Status).toBe('NOT_STARTED');
      });
    });

    it('resetTasks clears time fields', () => {
      const reset = resetTasks();

      reset.forEach((task) => {
        expect(task['Time Start']).toBeUndefined();
        expect(task['Time End']).toBeUndefined();
        expect(task['Average Time (s)']).toBeUndefined();
        expect(task.Trials).toEqual([]);
      });
    });
  });

  describe('measurementConfig', () => {
    it('trials getter returns store value', () => {
      expect(measurementConfig.trials).toBe(3);
    });

    it('primaryRunnerTag getter returns store value', () => {
      expect(measurementConfig.primaryRunnerTag).toBe('linux');
    });

    it('secondaryRunnerTag getter returns store value', () => {
      expect(measurementConfig.secondaryRunnerTag).toBe('windows');
    });
  });
});
