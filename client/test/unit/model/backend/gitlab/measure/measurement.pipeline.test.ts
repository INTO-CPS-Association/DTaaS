import {
  measurementState,
  setMeasurementStore,
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  runDigitalTwin,
  cancelActivePipelines,
  createTrialFromExecution,
  createTrialFromError,
  runTrials,
} from 'model/backend/gitlab/measure/measurement.pipeline';
import type { Trial } from 'model/backend/gitlab/measure/measurement.execution';
import { getAuthority } from 'util/envUtil';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';
import DigitalTwin from 'model/backend/digitalTwin';
import {
  isPipelineCompleted,
  delay,
  hasTimedOut,
  getChildPipelineId,
} from 'model/backend/gitlab/execution/pipelineCore';
import {
  createMockStoreState,
  createMockBackend,
  createMockExecution,
  createMockActivePipeline,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';
import {
  setupSessionStorage,
  setupSessionStorageAuth,
} from 'test/unit/model/backend/gitlab/measure/measurement.envSetup';

jest.mock('util/envUtil', () => ({
  getAuthority: jest.fn(),
}));
jest.mock('model/backend/gitlab/gitlabFactory', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('model/backend/digitalTwin', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  isPipelineCompleted: jest.fn(),
  delay: jest.fn().mockResolvedValue(undefined),
  hasTimedOut: jest.fn(),
  getChildPipelineId: jest.fn((id: number) => id + 1),
}));

const mockGetState = jest.fn();
const mockGetAuthority = getAuthority as jest.MockedFunction<
  typeof getAuthority
>;
const mockCreateGitlabInstance = createGitlabInstance as jest.MockedFunction<
  typeof createGitlabInstance
>;
const mockDigitalTwin = DigitalTwin as jest.MockedClass<typeof DigitalTwin>;
const mockIsPipelineCompleted = isPipelineCompleted as jest.MockedFunction<
  typeof isPipelineCompleted
>;
const mockDelay = delay as jest.MockedFunction<typeof delay>;
const mockHasTimedOut = hasTimedOut as jest.MockedFunction<typeof hasTimedOut>;
const mockGetChildPipelineId = getChildPipelineId as jest.MockedFunction<
  typeof getChildPipelineId
>;

let originalMeasurementState: typeof measurementState;
let mockBackendInstance: ReturnType<typeof createMockBackend>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetChildPipelineId.mockImplementation((id: number) => id + 1);
  originalMeasurementState = { ...measurementState };
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
  mockGetAuthority.mockReturnValue('https://gitlab.example.com');

  mockBackendInstance = createMockBackend(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockCreateGitlabInstance.mockReturnValue(mockBackendInstance as any);
  setupSessionStorageAuth();

  mockDigitalTwin.mockImplementation(
    () =>
      ({
        execute: jest.fn().mockResolvedValue(123),
      }) as unknown as DigitalTwin,
  );

  mockIsPipelineCompleted.mockReturnValueOnce(false).mockReturnValue(true);
  mockBackendInstance.getPipelineStatus?.mockResolvedValue('success');
  mockHasTimedOut.mockReturnValue(false);
});

afterEach(() => {
  measurementState.shouldStopPipelines =
    originalMeasurementState.shouldStopPipelines;
  measurementState.activePipelines = originalMeasurementState.activePipelines;
  measurementState.executionResults = originalMeasurementState.executionResults;
  measurementState.currentMeasurementPromise =
    originalMeasurementState.currentMeasurementPromise;
});

describe('runDigitalTwin', () => {
  it('should throw error if not authenticated', async () => {
    (sessionStorage.getItem as jest.Mock).mockReturnValue(null);

    await expect(runDigitalTwin('test-dt')).rejects.toThrow(
      'Not authenticated. Missing access_token or username.',
    );
  });

  it('should throw error if access_token is missing', async () => {
    (sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'username') return 'test-user';
      return null;
    });

    await expect(runDigitalTwin('test-dt')).rejects.toThrow(
      'Not authenticated. Missing access_token or username.',
    );
  });

  it('should throw error if username is missing', async () => {
    (sessionStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'access_token') return 'test-token';
      return null;
    });

    await expect(runDigitalTwin('test-dt')).rejects.toThrow(
      'Not authenticated. Missing access_token or username.',
    );
  });

  it('should create gitlab instance with correct parameters', async () => {
    await runDigitalTwin('test-dt');

    expect(mockCreateGitlabInstance).toHaveBeenCalledWith(
      'test-user',
      'test-token',
      'https://gitlab.example.com',
    );
  });

  it('should initialize backend', async () => {
    await runDigitalTwin('test-dt');

    expect(mockBackendInstance.init).toHaveBeenCalled();
  });

  it('should pass runner tag to digitalTwin.execute when provided in config', async () => {
    await runDigitalTwin('test-dt', { 'Runner tag': 'custom-runner' });

    const dtInstance = mockDigitalTwin.mock.results[0].value;
    expect(dtInstance.execute).toHaveBeenCalledWith(
      true,
      'custom-runner',
      'main',
    );
  });

  it('should pass branch name to digitalTwin.execute when provided in config', async () => {
    await runDigitalTwin('test-dt', { 'Branch name': 'feature-branch' });

    const dtInstance = mockDigitalTwin.mock.results[0].value;
    expect(dtInstance.execute).toHaveBeenCalledWith(
      true,
      'linux',
      'feature-branch',
    );
  });

  it('should create DigitalTwin instance with correct name', async () => {
    await runDigitalTwin('hello-world');

    expect(mockDigitalTwin).toHaveBeenCalledWith(
      'hello-world',
      mockBackendInstance,
    );
  });

  it('should throw error if pipeline fails to start', async () => {
    mockDigitalTwin.mockImplementation(
      () =>
        ({
          execute: jest.fn().mockResolvedValue(null),
        }) as unknown as DigitalTwin,
    );

    await expect(runDigitalTwin('test-dt')).rejects.toThrow(
      'Failed to start pipeline for test-dt.',
    );
  });

  it('should return execution result with dtName and pipelineId', async () => {
    const result = await runDigitalTwin('hello-world');

    expect(result.dtName).toBe('hello-world');
    expect(result.pipelineId).toBe(123);
  });

  it('should merge provided config with current settings from Redux', async () => {
    const result = await runDigitalTwin('hello-world', {
      'Runner tag': 'custom',
    });

    expect(result.config['Branch name']).toBe('main');
    expect(result.config['Runner tag']).toBe('custom');
  });

  it('should track pipeline in executionResults and clear activePipelines', async () => {
    await runDigitalTwin('hello-world');

    expect(measurementState.executionResults).toHaveLength(1);
    expect(measurementState.executionResults[0].pipelineId).toBe(123);
    expect(measurementState.activePipelines).toHaveLength(0);
  });

  it('should stop polling when shouldStopPipelines is true', async () => {
    mockIsPipelineCompleted.mockReturnValue(false);

    mockDelay.mockImplementation(async () => {
      measurementState.shouldStopPipelines = true;
    });

    await expect(runDigitalTwin('hello-world')).rejects.toThrow(
      'stopped by user',
    );
  });

  it('should throw timeout error when pipeline exceeds max time', async () => {
    mockIsPipelineCompleted.mockReturnValue(false);
    mockHasTimedOut.mockReturnValue(true);

    await expect(runDigitalTwin('hello-world')).rejects.toThrow('timed out');
  });
});

describe('cancelActivePipelines', () => {
  it('cancels all active pipelines', async () => {
    const mockBackend1 = createMockBackend(1);
    const mockBackend2 = createMockBackend(2);
    measurementState.activePipelines = [
      createMockActivePipeline({ backend: mockBackend1, pipelineId: 10 }),
      createMockActivePipeline({ backend: mockBackend2, pipelineId: 20 }),
    ];

    await cancelActivePipelines();

    expect(mockBackend1.api.cancelPipeline).toHaveBeenCalledWith(1, 10);
    expect(mockBackend2.api.cancelPipeline).toHaveBeenCalledWith(2, 20);
  });

  it('does nothing when there are no active pipelines', async () => {
    measurementState.activePipelines = [];
    await expect(cancelActivePipelines()).resolves.toBeUndefined();
  });

  it('continues cancelling remaining pipelines when one throws', async () => {
    const mockBackend1 = createMockBackend(1);
    const mockBackend2 = createMockBackend(2);
    mockBackend1.api.cancelPipeline.mockRejectedValue(
      new Error('network error'),
    );
    measurementState.activePipelines = [
      createMockActivePipeline({ backend: mockBackend1, pipelineId: 10 }),
      createMockActivePipeline({ backend: mockBackend2, pipelineId: 20 }),
    ];

    await cancelActivePipelines();

    expect(mockBackend2.api.cancelPipeline).toHaveBeenCalledWith(2, 20);
  });
});

describe('createTrialFromExecution', () => {
  it('returns SUCCESS trial when all executions succeed', () => {
    const trialStart = new Date('2026-01-01T10:00:00.000Z');
    const executions = [
      createMockExecution({ status: 'success' }),
      createMockExecution({ status: 'success' }),
    ];

    const trial = createTrialFromExecution(trialStart, executions);

    expect(trial.Status).toBe('SUCCESS');
    expect(trial['Time Start']).toBe(trialStart);
    expect(trial.Execution).toBe(executions);
    expect(trial.Error).toBeUndefined();
  });

  it('returns FAILURE trial when any execution has a failure status', () => {
    const executions = [
      createMockExecution({ status: 'success' }),
      createMockExecution({ status: 'failed' }),
    ];

    const trial = createTrialFromExecution(new Date(), executions);

    expect(trial.Status).toBe('FAILURE');
  });
});

describe('createTrialFromError', () => {
  it('returns STOPPED trial when wasStopped is true', () => {
    const trialStart = new Date();

    const trial = createTrialFromError(
      trialStart,
      new Error('stopped by user'),
      true,
    );

    expect(trial.Status).toBe('STOPPED');
    expect(trial['Time End']).toBeUndefined();
    expect(trial.Error).toBeUndefined();
  });

  it('returns FAILURE trial with error when wasStopped is false', () => {
    const trial = createTrialFromError(
      new Date(),
      new Error('network failure'),
      false,
    );

    expect(trial.Status).toBe('FAILURE');
    expect(trial['Time End']).toBeInstanceOf(Date);
    expect(trial.Error?.message).toBe('network failure');
  });

  it('handles non-Error thrown values', () => {
    const trial = createTrialFromError(new Date(), 'string error', false);

    expect(trial.Status).toBe('FAILURE');
    expect(trial.Error?.message).toBe('string error');
  });

  it('captures active pipelines in Execution list', () => {
    const mockBackend = createMockBackend(1);
    measurementState.currentTrialMinPipelineId = 50;
    measurementState.activePipelines = [
      createMockActivePipeline({ backend: mockBackend, pipelineId: 50 }),
    ];

    const trial = createTrialFromError(new Date(), new Error('fail'), false);

    expect(trial.Execution.some((e) => e.pipelineId === 50)).toBe(true);
  });
});

describe('runTrials', () => {
  it('runs the specified number of trials', async () => {
    const updateTrials = jest.fn();

    const trials = await runTrials(
      [{ dtName: 'hello-world', config: {} }],
      1,
      [],
      updateTrials,
    );

    expect(trials).toHaveLength(1);
    expect(updateTrials).toHaveBeenCalled();
  });

  it('stops early when shouldStopPipelines is already true', async () => {
    measurementState.shouldStopPipelines = true;
    const updateTrials = jest.fn();

    const trials = await runTrials(
      [{ dtName: 'hello-world', config: {} }],
      3,
      [],
      updateTrials,
    );

    expect(trials).toHaveLength(0);
  });

  it('starts from existing trials and adds up to targetTrials', async () => {
    const existing: Trial[] = [
      {
        'Time Start': new Date(),
        'Time End': new Date(),
        Execution: [],
        Status: 'SUCCESS',
        Error: undefined,
      },
    ];
    const updateTrials = jest.fn();

    const trials = await runTrials(
      [{ dtName: 'hello-world', config: {} }],
      2,
      existing,
      updateTrials,
    );

    expect(trials).toHaveLength(2);
  });
});
