import {
  measurementState,
  setMeasurementStore,
} from 'src/gitlab/measure/measurement.execution';
import {
  runDigitalTwin,
  cancelActivePipelines,
  createTrialFromExecution,
  createTrialFromError,
  runTrials,
} from 'src/gitlab/measure/measurement.pipeline';
import type { Trial } from 'src/gitlab/measure/measurement.execution';
import getAuthority from 'src/util/env';
import createGitlabInstance from 'src/gitlab/gitlabFactory';
import DigitalTwin from 'src/digitalTwin';
import {
  isPipelineCompleted,
  delay,
  hasTimedOut,
} from 'src/gitlab/execution/pipelineCore';
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

jest.mock('src/util/env', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('src/gitlab/gitlabFactory', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('src/digitalTwin', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('src/gitlab/execution/pipelineCore', () => ({
  isPipelineCompleted: jest.fn(),
  delay: jest.fn().mockResolvedValue(undefined),
  hasTimedOut: jest.fn(),
}));

const mockGetState = jest.fn();
const mockShowSnackbar = jest.fn();
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

let originalMeasurementState: typeof measurementState;
let mockBackendInstance: ReturnType<typeof createMockBackend>;

beforeEach(() => {
  jest.clearAllMocks();
  mockDelay.mockResolvedValue(undefined);
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
    showSnackbar: mockShowSnackbar,
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
  mockBackendInstance.getChildPipelineId.mockResolvedValue(456);
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

  it('retries a pipeline GitLab rejects shortly after it starts', async () => {
    const execute = jest.fn().mockResolvedValueOnce(123).mockResolvedValue(124);
    mockDigitalTwin.mockImplementation(
      () => ({ execute }) as unknown as DigitalTwin,
    );
    mockBackendInstance
      .getPipelineStatus!.mockResolvedValueOnce('failed')
      .mockResolvedValue('success');

    const result = await runDigitalTwin('test-dt');

    expect(execute).toHaveBeenCalledTimes(2);
    expect(mockBackendInstance.api.cancelPipeline).toHaveBeenCalledWith(1, 123);
    expect(result.pipelineId).toBe(124);
  });

  it('does not retry a pending pipeline', async () => {
    mockBackendInstance
      .getPipelineStatus!.mockResolvedValueOnce('pending')
      .mockResolvedValue('success');

    await runDigitalTwin('test-dt');

    const dtInstance = mockDigitalTwin.mock.results[0].value;
    expect(dtInstance.execute).toHaveBeenCalledTimes(1);
    expect(mockBackendInstance.api.cancelPipeline).not.toHaveBeenCalled();
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

  it('should retry resolving the child pipeline id until GitLab reports it', async () => {
    mockDelay.mockResolvedValue(undefined);
    mockBackendInstance.getChildPipelineId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(456);

    const result = await runDigitalTwin('hello-world');

    expect(mockBackendInstance.getChildPipelineId).toHaveBeenCalledTimes(3);
    expect(result.pipelineId).toBe(123);
  });

  it('returns a failed measurement result when child discovery fails', async () => {
    mockBackendInstance.getChildPipelineId.mockRejectedValue(
      new Error('GitLab unavailable'),
    );

    await expect(runDigitalTwin('hello-world')).rejects.toThrow(
      'GitLab unavailable',
    );

    expect(mockBackendInstance.getChildPipelineId).toHaveBeenCalledTimes(1);
  });

  it('should time out if the child pipeline never appears', async () => {
    mockDelay.mockResolvedValue(undefined);
    mockBackendInstance.getChildPipelineId.mockResolvedValue(null);
    mockHasTimedOut.mockReturnValueOnce(false).mockReturnValue(true);

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

  it('cancels the bridge-derived child, never an interleaved pipeline', async () => {
    const mockBackend = createMockBackend(1);
    mockBackend.getChildPipelineId.mockResolvedValue(102);
    measurementState.activePipelines = [
      createMockActivePipeline({ backend: mockBackend, pipelineId: 100 }),
    ];

    await cancelActivePipelines();

    expect(mockBackend.getChildPipelineId).toHaveBeenCalledWith(1, 100);
    expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 100);
    expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 102);
    expect(mockBackend.api.cancelPipeline).not.toHaveBeenCalledWith(1, 101);
  });

  it('uses the stored child pipeline id without an additional lookup', async () => {
    const mockBackend = createMockBackend(1);
    measurementState.activePipelines = [
      createMockActivePipeline({
        backend: mockBackend,
        pipelineId: 10,
        childPipelineId: 11,
      }),
    ];

    await cancelActivePipelines();

    expect(mockBackend.getChildPipelineId).not.toHaveBeenCalled();
    expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 10);
    expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 11);
  });

  it('cancels a known child when parent cancellation fails', async () => {
    const mockBackend = createMockBackend(1);
    mockBackend.api.cancelPipeline.mockRejectedValueOnce(
      new Error('network error'),
    );
    measurementState.activePipelines = [
      createMockActivePipeline({
        backend: mockBackend,
        pipelineId: 10,
        childPipelineId: 11,
      }),
    ];

    await cancelActivePipelines();

    expect(mockBackend.getChildPipelineId).not.toHaveBeenCalled();
    expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 11);
  });

  it('does not attempt to cancel a child pipeline that has not been discovered yet', async () => {
    const mockBackend = createMockBackend(1);
    mockBackend.getChildPipelineId.mockResolvedValue(null);
    measurementState.activePipelines = [
      createMockActivePipeline({ backend: mockBackend, pipelineId: 10 }),
    ];

    await cancelActivePipelines();

    expect(mockBackend.api.cancelPipeline).toHaveBeenCalledTimes(1);
    expect(mockBackend.api.cancelPipeline).toHaveBeenCalledWith(1, 10);
  });

  it('warns when child discovery fails but continues with later pipelines', async () => {
    const failingBackend = createMockBackend(1);
    const nextBackend = createMockBackend(2);
    failingBackend.getChildPipelineId.mockRejectedValue(
      new Error('network error'),
    );
    measurementState.activePipelines = [
      createMockActivePipeline({ backend: failingBackend, pipelineId: 10 }),
      createMockActivePipeline({ backend: nextBackend, pipelineId: 20 }),
    ];

    await cancelActivePipelines();

    expect(mockShowSnackbar).toHaveBeenCalledWith(
      'Child pipeline for 10 could not be verified and may still be running.',
      'warning',
    );
    expect(nextBackend.api.cancelPipeline).toHaveBeenCalledWith(2, 20);
  });

  it('warns when a child pipeline cannot be cancelled', async () => {
    const mockBackend = createMockBackend(1);
    mockBackend.getChildPipelineId.mockResolvedValue(11);
    mockBackend.api.cancelPipeline
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('network error'));
    measurementState.activePipelines = [
      createMockActivePipeline({ backend: mockBackend, pipelineId: 10 }),
    ];

    await cancelActivePipelines();

    expect(mockShowSnackbar).toHaveBeenCalledWith(
      'Pipeline 11 could not be cancelled and may still be running.',
      'warning',
    );
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
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      'Pipeline 10 could not be cancelled and may still be running.',
      'warning',
    );
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
