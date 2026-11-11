import {
  buildResultsExport,
  buildTaskResultExport,
} from 'src/gitlab/measure/measurement.utils';
import {
  createMockTask,
  createMockTrial,
  createMockExecution,
  DEFAULT_CONFIG,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';

const SERIALIZED_TASK = {
  'Task Name': 'Test Task',
  Description: 'Test description',
  config: {},
  trials: [],
  'Time Start': '2026-01-01T10:00:00.000Z',
  'Time End': '2026-01-01T10:00:30.000Z',
  'Average Time (s)': 30,
  Status: 'SUCCESS',
};

function parseContent<T>({ content }: { content: string }): T {
  return JSON.parse(content) as T;
}

describe('measurement export', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-18T17:41:04.567Z'));
  });

  afterEach(() => jest.useRealTimers());

  describe('buildResultsExport', () => {
    it('names the JSON file after the current time', () => {
      expect(buildResultsExport([createMockTask()])).toMatchObject({
        fileName: 'measurement-2026-10-18T17-41-04.json',
        mimeType: 'application/json',
      });
    });

    it('returns the total time and the tasks as indented JSON', () => {
      const { content } = buildResultsExport([createMockTask()]);

      expect(content).toBe(
        JSON.stringify(
          { totalTimeSeconds: 30, tasks: [SERIALIZED_TASK] },
          null,
          2,
        ),
      );
    });
  });

  describe('buildTaskResultExport', () => {
    it('names the JSON file after the task and the current time', () => {
      const task = createMockTask({ 'Task Name': 'My Test Task' });

      expect(buildTaskResultExport(task)).toMatchObject({
        fileName: 'measurement-my-test-task-2026-10-18T17-41-04.json',
        mimeType: 'application/json',
      });
    });

    it('handles task names with multiple spaces', () => {
      const task = createMockTask({
        'Task Name': 'Task   With   Multiple   Spaces',
      });

      expect(buildTaskResultExport(task).fileName).toBe(
        'measurement-task-with-multiple-spaces-2026-10-18T17-41-04.json',
      );
    });

    it('returns the task duration and the task as indented JSON', () => {
      const { content } = buildTaskResultExport(createMockTask());

      expect(content).toBe(
        JSON.stringify(
          { totalTimeSeconds: 30, task: SERIALIZED_TASK },
          null,
          2,
        ),
      );
    });
  });

  describe('JSON structure', () => {
    it('includes config from first execution at task level', () => {
      const trial = createMockTrial({
        Execution: [createMockExecution({ executionIndex: 0 })],
      });
      const task = createMockTask({ Trials: [trial] });

      const result = parseContent<{
        task: { config: object };
      }>(buildTaskResultExport(task));

      const { 'Runner tag': _runnerTag, ...configWithoutRunner } =
        DEFAULT_CONFIG;
      expect(result.task.config).toEqual(configWithoutRunner);
    });

    it('includes dtName, pipelineId and status in trial executions', () => {
      const trial = createMockTrial({
        Execution: [
          createMockExecution({ executionIndex: 0, pipelineId: 999 }),
        ],
      });
      const task = createMockTask({ Trials: [trial] });

      const result = parseContent<{
        task: { trials: Array<{ executions: object[] }> };
      }>(buildTaskResultExport(task));

      expect(result.task.trials[0].executions[0]).toEqual({
        dtName: 'hello-world',
        pipelineId: 999,
        status: 'success',
        'Runner tag': DEFAULT_CONFIG['Runner tag'],
      });
    });

    it('produces empty config when task has no trials', () => {
      const task = createMockTask({ Trials: [] });

      const result = parseContent<{
        task: { config: object; trials: object[] };
      }>(buildTaskResultExport(task));

      expect(result.task.config).toEqual({});
      expect(result.task.trials).toEqual([]);
    });

    it('omits Error from trial when it is null', () => {
      const trial = createMockTrial({
        Execution: [createMockExecution({})],
        Error: undefined,
      });
      const task = createMockTask({ Trials: [trial] });

      const result = parseContent<{
        task: { trials: Array<{ Error?: object }> };
      }>(buildTaskResultExport(task));

      expect(result.task.trials[0]).not.toHaveProperty('Error');
    });

    it('includes Error in trial when it is present', () => {
      const trial = createMockTrial({
        Execution: [createMockExecution({})],
        Error: {
          message: 'Pipeline failed',
          error: new Error('Pipeline failed'),
        },
      });
      const task = createMockTask({ Trials: [trial] });

      const result = parseContent<{
        task: { trials: Array<{ Error?: { message: string } }> };
      }>(buildTaskResultExport(task));

      expect(result.task.trials[0].Error).toBeDefined();
      expect(result.task.trials[0].Error!.message).toBe('Pipeline failed');
    });

    it('applies the same structure to every task in buildResultsExport', () => {
      const trial = createMockTrial({
        Execution: [createMockExecution({ executionIndex: 0 })],
      });
      const task = createMockTask({ Trials: [trial] });

      const result = parseContent<{
        tasks: Array<{ config: object; trials: object[] }>;
      }>(buildResultsExport([task]));

      const { 'Runner tag': _runnerTag, ...configWithoutRunner } =
        DEFAULT_CONFIG;
      expect(result.tasks[0].config).toEqual(configWithoutRunner);
      expect(result.tasks[0].trials).toHaveLength(1);
    });
  });
});
