import type {
  ExecutionResult,
  TimedTask,
  Trial,
} from '@into-cps-association/dt-automation';

const DEFAULT_CONFIG = {
  'Branch name': 'main',
  'Group name': 'dtaas',
  'Common Library project name': 'common',
  'DT directory': 'digital_twins',
  'Runner tag': 'linux',
};

export function createMockTask(overrides: Partial<TimedTask> = {}): TimedTask {
  return {
    'Task Name': 'Test Task',
    Description: 'Test description',
    Trials: [],
    'Time Start': new Date('2026-01-01T10:00:00.000Z'),
    'Time End': new Date('2026-01-01T10:00:30.000Z'),
    'Average Time (s)': 30,
    Status: 'SUCCESS',
    ...overrides,
  };
}

export function createMockTaskPending(
  overrides: Partial<TimedTask> = {},
): TimedTask {
  return createMockTask({
    Description: 'Test task description',
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'NOT_STARTED',
    ...overrides,
  });
}

export function createMockTrial(overrides: Partial<Trial> = {}): Trial {
  return {
    'Time Start': undefined,
    'Time End': undefined,
    Execution: [],
    Status: 'SUCCESS',
    Error: undefined,
    ...overrides,
  };
}

export function createMockExecution(
  overrides: Partial<ExecutionResult> = {},
): ExecutionResult {
  return {
    dtName: 'hello-world',
    pipelineId: 123,
    status: 'success',
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

export async function clearDatabase(service: {
  getAll: () => Promise<Array<{ id: string }>>;
  delete: (id: string) => Promise<void>;
}): Promise<void> {
  const entries = await service.getAll();
  await Promise.all(entries.map((entry) => service.delete(entry.id)));
}
