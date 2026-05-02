import {
  measurementConfig as MeasurementConfig,
  DEFAULT_TASK,
  getTasks,
  resetTasks,
  setMeasurementStore,
} from 'model/backend/gitlab/measure/measurement.execution';
import { taskDefinitions } from 'model/backend/gitlab/measure/tasks';

const mockStoreState = {
  settings: {
    RUNNER_TAG: 'linux',
    BRANCH_NAME: 'main',
    GROUP_NAME: 'dtaas',
    DT_DIRECTORY: 'digital_twins',
    COMMON_LIBRARY_PROJECT_NAME: 'common',
    trials: 3,
    secondaryRunnerTag: 'windows',
    primaryDTName: 'hello-world',
    secondaryDTName: 'mass-spring-damper',
  },
};

setMeasurementStore({
  getState: () => mockStoreState as never,
  restoreRunnerTag: jest.fn(),
  restoreBranchName: jest.fn(),
  restoreSecondaryRunnerTag: jest.fn(),
  showSnackbar: jest.fn(),
});

describe('measurement.tasks', () => {
  const tasks = getTasks();

  it('should read trials from store', () => {
    expect(MeasurementConfig.trials).toBe(3);
  });

  it('should read primaryRunnerTag from store settings', () => {
    expect(MeasurementConfig.primaryRunnerTag).toBe('linux');
  });

  it('should read secondaryRunnerTag from store measurement', () => {
    expect(MeasurementConfig.secondaryRunnerTag).toBe('windows');
  });

  it('should have correct DEFAULT_TASK values', () => {
    expect(DEFAULT_TASK['Task Name']).toBe('');
    expect(DEFAULT_TASK.Description).toBe('');
    expect(DEFAULT_TASK.Trials).toEqual([]);
    expect(DEFAULT_TASK['Time Start']).toBeUndefined();
    expect(DEFAULT_TASK['Time End']).toBeUndefined();
    expect(DEFAULT_TASK['Average Time (s)']).toBeUndefined();
    expect(DEFAULT_TASK.Status).toBe('NOT_STARTED');
    expect(DEFAULT_TASK.Executions).toBeUndefined();
  });

  it('should be an array', () => {
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should contain pre-defined measurement tasks', () => {
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('should have tasks with required properties', () => {
    tasks.forEach((task) => {
      expect(task['Task Name']).toBeDefined();
      expect(task.Description).toBeDefined();
      expect(task.Executions).toBeDefined();
      expect(typeof task.Executions).toBe('function');
    });
  });

  it('should have exactly 5 pre-defined tasks', () => {
    expect(tasks.length).toBe(5);
  });

  it('should have unique task names', () => {
    const names = tasks.map((t) => t['Task Name']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('tasks are in expected order', () => {
    const names = tasks.map((t) => t['Task Name']);
    expect(names).toEqual([
      'Valid Setup Digital Twin Execution',
      'Multiple Identical Digital Twins Simultaneously',
      'Multiple different Digital Twins Simultaneously',
      'Different Runners same Digital Twin',
      'Different Runners different Digital Twins',
    ]);
  });

  it('should include Valid Setup Digital Twin Execution task', () => {
    const setupTask = tasks.find(
      (t) => t['Task Name'] === 'Valid Setup Digital Twin Execution',
    );
    expect(setupTask).toBeDefined();
    expect(setupTask?.Description).toContain('primary Digital Twin');
  });

  it('should include Multiple Identical Digital Twins task', () => {
    const multiTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple Identical Digital Twins Simultaneously',
    );
    expect(multiTask).toBeDefined();
  });

  it('should include Multiple different Digital Twins task', () => {
    const diffTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple different Digital Twins Simultaneously',
    );
    expect(diffTask).toBeDefined();
  });

  it('should include Different Runners same Digital Twin task', () => {
    const runnerTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners same Digital Twin',
    );
    expect(runnerTask).toBeDefined();
  });

  it('should include Different Runners different Digital Twins task', () => {
    const runnerDiffTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners different Digital Twins',
    );
    expect(runnerDiffTask).toBeDefined();
  });

  it('should reset all task fields while preserving identity', () => {
    const resetResults = resetTasks();
    expect(resetResults.length).toBe(tasks.length);
    resetResults.forEach((task, index) => {
      expect(task.Trials).toEqual([]);
      expect(task['Time Start']).toBeUndefined();
      expect(task['Time End']).toBeUndefined();
      expect(task['Average Time (s)']).toBeUndefined();
      expect(task.Status).toBe('NOT_STARTED');
      expect(task['Task Name']).toBe(tasks[index]['Task Name']);
      expect(task.Description).toBe(tasks[index].Description);
      expect(task.Executions).toBe(tasks[index].Executions);
    });
  });

  it('should not modify original tasks array', () => {
    const originalTaskName = tasks[0]['Task Name'];
    resetTasks();
    expect(tasks[0]['Task Name']).toBe(originalTaskName);
  });

  it('Valid Setup task should have correct executions', () => {
    const setupTask = tasks.find(
      (t) => t['Task Name'] === 'Valid Setup Digital Twin Execution',
    );
    const executions = setupTask?.Executions?.();

    expect(executions).toEqual([{ dtName: 'hello-world', config: {} }]);
  });

  it('Multiple Identical task should have two hello-world executions', () => {
    const multiTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple Identical Digital Twins Simultaneously',
    );
    const executions = multiTask?.Executions?.();

    expect(executions).toEqual([
      { dtName: 'hello-world', config: {} },
      { dtName: 'hello-world', config: {} },
    ]);
  });

  it('Multiple different task should have hello-world and mass-spring-damper executions', () => {
    const diffTask = tasks.find(
      (t) =>
        t['Task Name'] === 'Multiple different Digital Twins Simultaneously',
    );
    const executions = diffTask?.Executions?.();

    expect(executions).toEqual([
      { dtName: 'hello-world', config: {} },
      { dtName: 'mass-spring-damper', config: {} },
    ]);
  });

  it('Different Runners same DT task should use runner tags from config', () => {
    const runnerTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners same Digital Twin',
    );
    const executions = runnerTask?.Executions?.();

    expect(executions).toEqual([
      {
        dtName: 'hello-world',
        config: { 'Runner tag': MeasurementConfig.primaryRunnerTag },
      },
      {
        dtName: 'hello-world',
        config: { 'Runner tag': MeasurementConfig.secondaryRunnerTag },
      },
    ]);
  });

  it('Different Runners different DTs task should use both DTs and runner tags', () => {
    const runnerDiffTask = tasks.find(
      (t) => t['Task Name'] === 'Different Runners different Digital Twins',
    );
    const executions = runnerDiffTask?.Executions?.();

    expect(executions).toEqual([
      {
        dtName: 'hello-world',
        config: { 'Runner tag': MeasurementConfig.primaryRunnerTag },
      },
      {
        dtName: 'mass-spring-damper',
        config: { 'Runner tag': MeasurementConfig.secondaryRunnerTag },
      },
    ]);
  });

  describe('taskDefinitions', () => {
    it.each(taskDefinitions.map((t) => [t.name, t]))(
      '%s has required fields',
      (_, task) => {
        expect(task.name).toBeTruthy();
        expect(task.description).toBeTruthy();
        expect(typeof task.executions).toBe('function');
        expect(Array.isArray(task.executions())).toBe(true);
        expect(task.executions().length).toBeGreaterThan(0);
      },
    );
  });
});
