import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  type DTExecutionResult,
  ExecutionStatus,
} from '@into-cps-association/dt-automation';
import ExecutionTracker from 'src/digital-twins/dt-automation/execution-tracker.js';

const CHECK_INTERVAL = 1000;

const running: DTExecutionResult = {
  id: 'a',
  dtName: 'hello-world',
  pipelineId: 42,
  timestamp: 1,
  status: ExecutionStatus.RUNNING,
  jobLogs: [],
};

// Holds the executions and tells its listeners, as the package's store does.
function executionSource() {
  const listeners = new Set<() => void>();
  let executions: DTExecutionResult[] = [];
  return {
    executions: () => executions,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    checkRunningExecutions: jest.fn(async () => undefined),
    set(next: DTExecutionResult[]): void {
      executions = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('ExecutionTracker', () => {
  let source: ReturnType<typeof executionSource>;
  let tracker: ExecutionTracker;

  beforeEach(() => {
    source = executionSource();
    tracker = new ExecutionTracker(source, CHECK_INTERVAL);
  });

  afterEach(() => {
    tracker.stop();
    jest.useRealTimers();
  });

  it('publishes an execution when it appears and when its status or logs change', () => {
    const seen: DTExecutionResult[] = [];
    tracker.changes().subscribe((record) => seen.push(record));
    tracker.start();
    const completed = { ...running, status: ExecutionStatus.COMPLETED };
    const logged = {
      ...completed,
      jobLogs: [{ jobName: 'execute', log: 'done' }],
    };

    for (const execution of [running, completed, logged, logged]) {
      source.set([execution]);
    }

    expect(
      seen.map((record) => [record.status, record.jobLogs.length]),
    ).toEqual([
      ['running', 0],
      ['completed', 0],
      ['completed', 1],
    ]);
  });

  it('publishes each of two running executions when its own status changes', () => {
    const seen: DTExecutionResult[] = [];
    tracker.changes().subscribe((record) => seen.push(record));
    tracker.start();
    const other = { ...running, id: 'b', pipelineId: 43 };

    source.set([running, other]);
    source.set([running, { ...other, status: ExecutionStatus.COMPLETED }]);
    source.set([
      { ...running, status: ExecutionStatus.FAILED },
      { ...other, status: ExecutionStatus.COMPLETED },
    ]);

    expect(seen.map((record) => [record.id, record.status])).toEqual([
      ['a', 'running'],
      ['b', 'running'],
      ['b', 'completed'],
      ['a', 'failed'],
    ]);
  });

  it('checks the running executions on the interval until stopped', async () => {
    jest.useFakeTimers();
    tracker.start();

    await jest.advanceTimersByTimeAsync(2.5 * CHECK_INTERVAL);
    expect(source.checkRunningExecutions).toHaveBeenCalledTimes(2);

    tracker.stop();
    await jest.advanceTimersByTimeAsync(2 * CHECK_INTERVAL);
    expect(source.checkRunningExecutions).toHaveBeenCalledTimes(2);
  });

  it('publishes nothing after it is stopped', () => {
    const seen: DTExecutionResult[] = [];
    tracker.changes().subscribe((record) => seen.push(record));
    tracker.start();
    tracker.stop();

    source.set([running]);

    expect(seen).toEqual([]);
  });

  it('completes the change stream when stopped', () => {
    const completed = jest.fn();
    tracker.changes().subscribe({ complete: completed });

    tracker.start();
    tracker.stop();

    expect(completed).toHaveBeenCalledTimes(1);
  });
});
