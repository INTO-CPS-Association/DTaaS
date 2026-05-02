import {
  downloadResultsJson,
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/measurement.utils';
import {
  createMockTask,
  createMockTrial,
  createMockExecution,
  DEFAULT_CONFIG,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';
import { setupMockDownload } from 'test/unit/model/backend/gitlab/measure/measurement.envSetup';

function captureJsonDownload<T>(action: () => void): T {
  let capturedJson = '';
  const OriginalBlob = globalThis.Blob;
  globalThis.Blob = function MockBlob(parts: BlobPart[]) {
    capturedJson = parts[0] as string;
  } as unknown as typeof Blob;
  action();
  globalThis.Blob = OriginalBlob;
  return JSON.parse(capturedJson) as T;
}

describe('measurement download', () => {
  describe('downloadResultsJson', () => {
    let downloadMocks: ReturnType<typeof setupMockDownload>;

    beforeEach(() => {
      downloadMocks = setupMockDownload();
    });

    afterEach(() => {
      downloadMocks.restore();
    });

    it('should create a blob with correct JSON data', () => {
      const results = [createMockTask({ 'Task Name': 'Test Task' })];

      downloadResultsJson(results);

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('should create an anchor element and trigger click', () => {
      const results = [createMockTask()];

      downloadResultsJson(results);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(downloadMocks.mockClick).toHaveBeenCalled();
    });

    it('should revoke the object URL after download', () => {
      const results = [createMockTask()];

      downloadResultsJson(results);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should set correct download filename with timestamp', () => {
      const results = [createMockTask()];

      downloadResultsJson(results);

      expect(downloadMocks.mockLink.download).toMatch(
        /^measurement-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/,
      );
    });
  });

  describe('downloadTaskResultJson', () => {
    let downloadMocks: ReturnType<typeof setupMockDownload>;

    beforeEach(() => {
      downloadMocks = setupMockDownload();
    });

    afterEach(() => {
      downloadMocks.restore();
    });

    it('should create a blob with correct task JSON data', () => {
      const task = createMockTask({ 'Task Name': 'Single Task' });

      downloadTaskResultJson(task);

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('should create an anchor element and trigger click', () => {
      const task = createMockTask();

      downloadTaskResultJson(task);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(downloadMocks.mockClick).toHaveBeenCalled();
    });

    it('should revoke the object URL after download', () => {
      const task = createMockTask();

      downloadTaskResultJson(task);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should set correct download filename with task name slug', () => {
      const task = createMockTask({ 'Task Name': 'My Test Task' });

      downloadTaskResultJson(task);

      expect(downloadMocks.mockLink.download).toMatch(
        /^measurement-my-test-task-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/,
      );
    });

    it('should handle task names with multiple spaces', () => {
      const task = createMockTask({
        'Task Name': 'Task   With   Multiple   Spaces',
      });

      downloadTaskResultJson(task);

      expect(downloadMocks.mockLink.download).toMatch(
        /^measurement-task-with-multiple-spaces-/,
      );
    });
  });

  describe('JSON structure', () => {
    let downloadMocks: ReturnType<typeof setupMockDownload>;

    beforeEach(() => {
      downloadMocks = setupMockDownload();
    });

    afterEach(() => {
      downloadMocks.restore();
    });

    it('includes config from first execution at task level', () => {
      const trial = createMockTrial({
        Execution: [createMockExecution({ executionIndex: 0 })],
      });
      const task = createMockTask({ Trials: [trial] });

      const result = captureJsonDownload<{
        task: { config: object };
      }>(() => downloadTaskResultJson(task));

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

      const result = captureJsonDownload<{
        task: { trials: Array<{ executions: object[] }> };
      }>(() => downloadTaskResultJson(task));

      expect(result.task.trials[0].executions[0]).toEqual({
        dtName: 'hello-world',
        pipelineId: 999,
        status: 'success',
        'Runner tag': DEFAULT_CONFIG['Runner tag'],
      });
    });

    it('produces empty config when task has no trials', () => {
      const task = createMockTask({ Trials: [] });

      const result = captureJsonDownload<{
        task: { config: object; trials: object[] };
      }>(() => downloadTaskResultJson(task));

      expect(result.task.config).toEqual({});
      expect(result.task.trials).toEqual([]);
    });

    it('omits Error from trial when it is null', () => {
      const trial = createMockTrial({
        Execution: [createMockExecution({})],
        Error: undefined,
      });
      const task = createMockTask({ Trials: [trial] });

      const result = captureJsonDownload<{
        task: { trials: Array<{ Error?: object }> };
      }>(() => downloadTaskResultJson(task));

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

      const result = captureJsonDownload<{
        task: { trials: Array<{ Error?: { message: string } }> };
      }>(() => downloadTaskResultJson(task));

      expect(result.task.trials[0].Error).toBeDefined();
      expect(result.task.trials[0].Error!.message).toBe('Pipeline failed');
    });

    it('applies the same structure to every task in downloadResultsJson', () => {
      const trial = createMockTrial({
        Execution: [createMockExecution({ executionIndex: 0 })],
      });
      const task = createMockTask({ Trials: [trial] });

      const result = captureJsonDownload<{
        tasks: Array<{ config: object; trials: object[] }>;
      }>(() => downloadResultsJson([task]));

      const { 'Runner tag': _runnerTag, ...configWithoutRunner } =
        DEFAULT_CONFIG;
      expect(result.tasks[0].config).toEqual(configWithoutRunner);
      expect(result.tasks[0].trials).toHaveLength(1);
    });
  });
});
