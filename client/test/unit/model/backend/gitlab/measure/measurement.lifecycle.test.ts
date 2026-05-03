import {
  restartMeasurement,
  handleBeforeUnload,
  handleUnload,
} from 'model/backend/gitlab/measure/measurement.runner';
import {
  restoreOriginalSettings,
  resetTasks,
} from 'model/backend/gitlab/measure/measurement.execution';
import type { Configuration } from 'model/backend/gitlab/measure/measurement.types';
import { cancelActivePipelines } from 'model/backend/gitlab/measure/measurement.pipeline';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import { setupMeasurementTestHarness } from './measurement.testUtil';

const STUB_CONFIG: Configuration = {
  'Branch name': 'main',
  'Group name': 'group',
  'Common Library project name': 'common',
  'DT directory': 'digital_twins',
  'Runner tag': 'linux',
};

jest.mock('model/backend/gitlab/measure/measurement.execution', () => {
  const { createMeasurementExecutionMock } = jest.requireActual(
    './measurement.envSetup',
  );
  return createMeasurementExecutionMock();
});

jest.mock('model/backend/gitlab/measure/measurement.pipeline', () => ({
  cancelActivePipelines: jest.fn().mockResolvedValue(undefined),
  runTrials: jest.fn().mockResolvedValue([]),
}));
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
jest.mock('database/measurementHistoryDB', () => ({
  __esModule: true,
  default: {
    add: jest.fn(() => Promise.resolve()),
    purge: jest.fn(() => Promise.resolve()),
  },
}));

describe('measurement.lifecycle', () => {
  const harness = setupMeasurementTestHarness();

  beforeEach(() => {
    harness.reset();
  });

  it('should cancel, restore settings, wait for promise and reset state', async () => {
    harness.mockMeasurementConfig.trials = 1;
    let resolve: () => void = () => {};
    harness.state.currentMeasurementPromise = new Promise((r) => {
      resolve = r;
    });
    const promise = restartMeasurement(harness.setters, harness.isRunningRef);
    resolve();
    await promise;
    expect(cancelActivePipelines).toHaveBeenCalled();
    expect(restoreOriginalSettings).toHaveBeenCalled();
    expect(resetTasks).toHaveBeenCalled();
  });

  it('should not restart if already restarting', async () => {
    harness.mockMeasurementConfig.trials = 1;
    await Promise.all([
      restartMeasurement(harness.setters, harness.isRunningRef),
      restartMeasurement(harness.setters, harness.isRunningRef),
    ]);
    expect(cancelActivePipelines).toHaveBeenCalledTimes(1);
  });

  it('handleBeforeUnload should do nothing if not running or no active pipelines', () => {
    const preventDefault = jest.fn();
    handleBeforeUnload(
      { preventDefault, returnValue: '' } as unknown as BeforeUnloadEvent,
      harness.isRunningRef,
    );
    expect(preventDefault).not.toHaveBeenCalled();
    harness.isRunningRef.current = true;
    handleBeforeUnload(
      { preventDefault, returnValue: '' } as unknown as BeforeUnloadEvent,
      harness.isRunningRef,
    );
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('handleUnload should do nothing if not running or no active pipelines', () => {
    handleUnload(harness.isRunningRef);
    expect(harness.state.shouldStopPipelines).toBe(false);
    harness.isRunningRef.current = true;
    handleUnload(harness.isRunningRef);
    expect(harness.state.shouldStopPipelines).toBe(false);
  });

  it('handleUnload should cancel pipelines and handle errors gracefully', () => {
    harness.isRunningRef.current = true;
    const cancelFn = jest.fn().mockReturnValue({ catch: jest.fn() });
    harness.state.activePipelines = [
      {
        backend: {
          getProjectId: () => 1,
          api: { cancelPipeline: cancelFn },
        } as unknown as BackendInterface,
        pipelineId: 100,
        dtName: 'test',
        config: STUB_CONFIG,
        status: 'running',
        phase: 'parent',
      },
    ];
    handleUnload(harness.isRunningRef);
    expect(harness.state.shouldStopPipelines).toBe(true);
    expect(cancelFn).toHaveBeenCalledWith(1, 100);

    harness.reset();
    harness.isRunningRef.current = true;
    harness.state.activePipelines = [
      {
        backend: {
          getProjectId: () => {
            throw new Error('Mock getProjectId error');
          },
          api: { cancelPipeline: jest.fn() },
        } as unknown as BackendInterface,
        pipelineId: 100,
        dtName: 'test',
        config: STUB_CONFIG,
        status: 'running',
        phase: 'parent',
      },
    ];
    expect(() => handleUnload(harness.isRunningRef)).not.toThrow();
    expect(restoreOriginalSettings).toHaveBeenCalled();
  });
});
