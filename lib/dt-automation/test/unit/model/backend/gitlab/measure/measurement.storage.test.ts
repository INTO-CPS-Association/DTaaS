import { createTestStorage } from 'test/unit/model/backend/gitlab/measure/measurement.envSetup';
import {
  createMockTask,
  createMockTrial,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';
import type { TimedTask } from 'src/gitlab/measure/measurement.types';

const RESULTS_STORAGE_KEY = 'measurementResults';

// Fresh modules have no registered storage and no results, as after a page load.
async function loadModules() {
  jest.resetModules();
  const execution = await import('src/gitlab/measure/measurement.execution');
  const runner = await import('src/gitlab/measure/measurement.runner');
  const tasks = await import('src/gitlab/measure/tasks');
  return { ...execution, ...runner, ...tasks };
}

function storageWith(tasks: TimedTask[]) {
  return createTestStorage({ [RESULTS_STORAGE_KEY]: JSON.stringify(tasks) });
}

function failingStorage(method: 'getItem' | 'removeItem') {
  const storage = createTestStorage();
  storage[method].mockImplementation(() => {
    throw new Error('Storage is not available');
  });
  return storage;
}

function interruptedResults(runningTaskName: string): TimedTask[] {
  return [
    createMockTask({
      'Task Name': runningTaskName,
      Status: 'RUNNING',
      Trials: [createMockTrial(), createMockTrial({ Status: 'RUNNING' })],
    }),
    createMockTask({ Status: 'PENDING' }),
    createMockTask({ Status: 'FAILURE' }),
  ];
}

describe('measurement results storage', () => {
  it('touches no storage when the package is imported', async () => {
    const storage = storageWith([createMockTask({ Status: 'RUNNING' })]);
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: storage,
      configurable: true,
    });
    jest.resetModules();
    const { measurementState } = await import('../../../../../../index');
    Reflect.deleteProperty(globalThis, 'sessionStorage');

    Object.values(storage).forEach((method) =>
      expect(method).not.toHaveBeenCalled(),
    );
    expect(measurementState.results).toBeNull();
  });

  it('restores saved results, marking running tasks and trials as stopped', async () => {
    const { measurementState, setMeasurementResultsStorage, taskDefinitions } =
      await loadModules();
    const saved = interruptedResults(taskDefinitions[0].name);

    setMeasurementResultsStorage(storageWith(saved));

    const results = measurementState.results ?? [];
    expect(results.map((task) => task.Status)).toEqual([
      'STOPPED',
      'STOPPED',
      'FAILURE',
    ]);
    expect(results[0].Trials.map((trial) => trial.Status)).toEqual([
      'SUCCESS',
      'STOPPED',
    ]);
    expect(results[0]['Time Start']).toEqual(saved[0]['Time Start']);
    expect(results[0].Executions).toBe(taskDefinitions[0].executions);
    expect(measurementState.restoredAfterRefresh).toBe(true);
  });

  it('restores saved results only while the results are null', async () => {
    const { measurementState, setMeasurementResultsStorage } =
      await loadModules();
    const second = storageWith([createMockTask(), createMockTask()]);

    setMeasurementResultsStorage(storageWith([createMockTask()]));
    setMeasurementResultsStorage(second);

    expect(measurementState.results).toHaveLength(1);
    expect(second.getItem).not.toHaveBeenCalled();
  });

  it.each([
    [
      'unreadable saved results',
      createTestStorage({ [RESULTS_STORAGE_KEY]: '{' }),
    ],
    ['a failing storage', failingStorage('getItem')],
  ])('starts without results from %s', async (_case, storage) => {
    const { measurementState, setMeasurementResultsStorage } =
      await loadModules();

    expect(() => setMeasurementResultsStorage(storage)).not.toThrow();
    expect(measurementState.results).toBeNull();
  });

  it('restores the results it saved before a reload', async () => {
    const storage = createTestStorage();
    const tasks = [createMockTask({ Trials: [createMockTrial()] })];
    const beforeReload = await loadModules();
    beforeReload.setMeasurementResultsStorage(storage);
    beforeReload.wrapSetters().setResults(tasks);

    const afterReload = await loadModules();
    afterReload.setMeasurementResultsStorage(storage);

    expect(afterReload.measurementState.results).toEqual(tasks);
  });

  it('purges the saved results', async () => {
    const modules = await loadModules();
    const storage = createTestStorage();
    modules.setMeasurementResultsStorage(storage);
    modules.wrapSetters().setResults([createMockTask()]);

    await modules.purgeMeasurementData();

    expect(storage.getItem(RESULTS_STORAGE_KEY)).toBeNull();
    expect(modules.measurementState.results).toEqual(modules.resetTasks());
  });

  it('purges the results in memory when the storage fails', async () => {
    const modules = await loadModules();
    modules.setMeasurementResultsStorage(failingStorage('removeItem'));
    modules.wrapSetters().setResults([createMockTask()]);

    await expect(modules.purgeMeasurementData()).resolves.toBeUndefined();
    expect(modules.measurementState.results).toEqual(modules.resetTasks());
  });

  it('purges without a registered storage', async () => {
    const modules = await loadModules();

    await expect(modules.purgeMeasurementData()).resolves.toBeUndefined();
    expect(modules.measurementState.results).toEqual(modules.resetTasks());
  });
});
