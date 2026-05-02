import {
  startMeasurement,
  stopAllPipelines,
  purgeMeasurementData,
  restartMeasurement,
  handleBeforeUnload,
  handleUnload,
  setMeasurementDB,
} from 'model/backend/gitlab/measure/measurement.runner';
import {
  saveOriginalSettings,
  restoreOriginalSettings,
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  cancelActivePipelines,
  runTrials,
} from 'model/backend/gitlab/measure/measurement.pipeline';
import {
  setupMeasurementTestHarness,
  createMockActivePipeline,
  createMockBackend,
} from './measurement.testUtil';

jest.mock('model/backend/gitlab/measure/measurement.execution', () => {
  const { createMeasurementExecutionMock } = jest.requireActual(
    './measurement.envSetup',
  );
  return createMeasurementExecutionMock({ runDigitalTwin: jest.fn() });
});

jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  delay: jest.fn().mockResolvedValue(undefined),
  getChildPipelineId: jest.fn((id: number) => id + 1),
}));
jest.mock('model/backend/gitlab/execution/statusChecking', () => ({
  isFailureStatus: jest.fn(
    (s: string) =>
      s.toLowerCase() === 'failed' || s.toLowerCase() === 'skipped',
  ),
}));
jest.mock('model/backend/gitlab/measure/measurement.pipeline', () => ({
  runDigitalTwin: jest.fn(),
  cancelActivePipelines: jest.fn().mockResolvedValue(undefined),
  runTrials: jest.fn().mockResolvedValue([]),
}));
const mockMeasurementDB = {
  add: jest.fn(() => Promise.resolve('')),
  purge: jest.fn(() => Promise.resolve()),
};

describe('measurement.runner', () => {
  const harness = setupMeasurementTestHarness();

  beforeEach(() => {
    harness.reset();
    setMeasurementDB(mockMeasurementDB);
  });

  it('should not start if already running', async () => {
    harness.mockMeasurementConfig.trials = 1;
    harness.isRunningRef.current = true;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setIsRunning).not.toHaveBeenCalled();
  });

  it('should manage lifecycle and iterate through tasks', async () => {
    harness.mockMeasurementConfig.trials = 1;
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(harness.setters.setIsRunning).toHaveBeenCalledWith(true);
    expect(saveOriginalSettings).toHaveBeenCalled();
    expect(restoreOriginalSettings).toHaveBeenCalled();
    expect(harness.isRunningRef.current).toBe(false);
  });

  it('dispatches completion snackbar when all tasks finish without stopping', async () => {
    const mockShowSnackbar = jest.fn();
    const { getStore } = jest.requireMock(
      'model/backend/gitlab/measure/measurement.execution',
    );
    (getStore as jest.Mock).mockReturnValue({
      showSnackbar: mockShowSnackbar,
      getState: jest.fn(() => ({ settings: { disabledTaskNames: [] } })),
    });

    harness.mockMeasurementConfig.trials = 1;
    await startMeasurement(harness.setters, harness.isRunningRef);

    expect(mockShowSnackbar).toHaveBeenCalledWith(
      'All measurements completed',
      'info',
    );
  });

  it('does not dispatch completion snackbar when stopped', async () => {
    const mockShowSnackbar = jest.fn();
    const { getStore } = jest.requireMock(
      'model/backend/gitlab/measure/measurement.execution',
    );
    (getStore as jest.Mock).mockReturnValue({
      showSnackbar: mockShowSnackbar,
      getState: jest.fn(() => ({ settings: { disabledTaskNames: [] } })),
    });

    harness.mockMeasurementConfig.trials = 1;
    (runTrials as jest.Mock).mockImplementationOnce(async () => {
      harness.state.shouldStopPipelines = true;
      return [];
    });
    await startMeasurement(harness.setters, harness.isRunningRef);

    expect(mockShowSnackbar).not.toHaveBeenCalledWith(
      'All measurements completed',
      expect.any(String),
    );
  });

  it('should handle stop flag during measurement', async () => {
    harness.mockMeasurementConfig.trials = 1;
    (runTrials as jest.Mock).mockImplementationOnce(async () => {
      harness.state.shouldStopPipelines = true;
      return [];
    });
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(runTrials).toHaveBeenCalledTimes(1);
    expect(harness.isRunningRef.current).toBe(false);
  });

  it('should transition NOT_STARTED to PENDING and run multiple trials', async () => {
    harness.mockMeasurementConfig.trials = 2;
    harness.resultsRef.current = harness.resultsRef.current.map((t) => ({
      ...t,
      Status: 'NOT_STARTED' as const,
    }));
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(runTrials).toHaveBeenCalledTimes(2);
    const results = harness.resultsRef.current;
    results.forEach((task) => {
      expect(task.Status).not.toBe('NOT_STARTED');
      expect(task.Status).not.toBe('PENDING');
    });
  });

  it('should stop pipelines and update statuses', async () => {
    harness.resultsRef.current = [
      { ...harness.resultsRef.current[0], Status: 'RUNNING' },
      { ...harness.resultsRef.current[1], Status: 'PENDING' },
    ];
    await stopAllPipelines();
    expect(harness.state.shouldStopPipelines).toBe(true);
    expect(cancelActivePipelines).toHaveBeenCalled();
    expect(harness.setters.setResults).toHaveBeenCalled();
  });

  it('should create trials with SUCCESS/FAILURE status based on results', async () => {
    harness.mockMeasurementConfig.trials = 1;
    await startMeasurement(harness.setters, harness.isRunningRef);
    const results = harness.resultsRef.current;
    expect(results).toHaveLength(2);
    results.forEach((task) => {
      expect(task.Status).toBe('SUCCESS');
      expect(task['Time End']).toBeDefined();
    });
  });

  it('should create STOPPED trial and capture pipelines on user stop', async () => {
    harness.mockMeasurementConfig.trials = 1;
    harness.state.currentTrialMinPipelineId = 100;
    harness.state.executionResults = [
      {
        dtName: 'dt',
        pipelineId: 100,
        status: 'success',
        config: {
          'Branch name': 'main',
          'Group name': 'dtaas',
          'Common Library project name': 'common',
          'DT directory': 'digital_twins',
          'Runner tag': 'linux',
        },
      },
    ];
    (runTrials as jest.Mock).mockImplementationOnce(async () => {
      harness.state.shouldStopPipelines = true;
      return [];
    });
    await startMeasurement(harness.setters, harness.isRunningRef);
    const results = harness.resultsRef.current;
    const stoppedTasks = results.filter((t) => t.Status === 'STOPPED');
    expect(stoppedTasks.length).toBeGreaterThanOrEqual(1);
  });

  it('should clean up on task error', async () => {
    harness.mockMeasurementConfig.trials = 1;
    (runTrials as jest.Mock).mockRejectedValueOnce(new Error('task error'));
    await expect(
      startMeasurement(harness.setters, harness.isRunningRef),
    ).rejects.toThrow('task error');
    expect(runTrials).toHaveBeenCalledTimes(1);
    expect(harness.isRunningRef.current).toBe(false);
    expect(restoreOriginalSettings).toHaveBeenCalled();
  });

  it('should break trial loop when shouldStopPipelines becomes true', async () => {
    harness.mockMeasurementConfig.trials = 3;
    (runTrials as jest.Mock).mockImplementationOnce(async () => {
      harness.state.shouldStopPipelines = true;
      return [];
    });
    await startMeasurement(harness.setters, harness.isRunningRef);
    expect(runTrials).toHaveBeenCalledTimes(1);
    const secondTask = harness.resultsRef.current[1];
    expect(secondTask.Status).not.toBe('RUNNING');
  });

  describe('purgeMeasurementData', () => {
    it('calls measurementDB.purge and resets state', async () => {
      await purgeMeasurementData();
      expect(mockMeasurementDB.purge).toHaveBeenCalled();
    });
  });

  describe('restartMeasurement', () => {
    it('stops pipelines, resets state, and starts measurement', async () => {
      await restartMeasurement(harness.setters, harness.isRunningRef);
      expect(cancelActivePipelines).toHaveBeenCalled();
      expect(harness.setters.setResults).toHaveBeenCalled();
    });

    it('guards against concurrent restarts', async () => {
      const p1 = restartMeasurement(harness.setters, harness.isRunningRef);
      const p2 = restartMeasurement(harness.setters, harness.isRunningRef);
      await Promise.all([p1, p2]);
      expect(cancelActivePipelines).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleBeforeUnload', () => {
    it('calls preventDefault when running with active pipelines', () => {
      const mockBackend = createMockBackend(1);
      harness.isRunningRef.current = true;
      harness.state.activePipelines = [
        createMockActivePipeline({ backend: mockBackend, pipelineId: 10 }),
      ];

      const preventDefault = jest.fn();
      handleBeforeUnload(
        { preventDefault, returnValue: '' } as unknown as BeforeUnloadEvent,
        harness.isRunningRef,
      );

      expect(preventDefault).toHaveBeenCalled();
      expect(mockBackend.api.cancelPipeline).not.toHaveBeenCalled();
    });

    it('does not call preventDefault when not running', () => {
      harness.isRunningRef.current = false;
      const preventDefault = jest.fn();

      handleBeforeUnload(
        { preventDefault, returnValue: '' } as unknown as BeforeUnloadEvent,
        harness.isRunningRef,
      );

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('handleUnload', () => {
    it('cancels active pipelines when running', () => {
      const mockBackend = createMockBackend(1);
      harness.isRunningRef.current = true;
      harness.state.activePipelines = [
        createMockActivePipeline({ backend: mockBackend, pipelineId: 10 }),
      ];

      handleUnload(harness.isRunningRef);

      expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 10);
    });

    it('only restores settings when not running', () => {
      const { restoreOriginalSettings: mockRestore } = jest.requireMock(
        'model/backend/gitlab/measure/measurement.execution',
      );
      harness.isRunningRef.current = false;

      handleUnload(harness.isRunningRef);

      expect(mockRestore).toHaveBeenCalled();
    });
  });
});
