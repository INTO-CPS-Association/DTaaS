import React from 'react';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import {
  TimedTask,
  Trial,
  ExecutionResult,
  Configuration,
  ActivePipeline,
  MeasurementSetters,
  measurementConfig,
  measurementState,
  getTasks,
} from 'model/backend/gitlab/measure/measurement.execution';
import type { MeasurementStoreState } from 'model/backend/gitlab/measure/measurement.execution';

// Writable version of measurementConfig for use in tests that mock the module.
export type MockMeasurementConfig = {
  trials: number;
  primaryRunnerTag: string;
  secondaryRunnerTag: string;
};

export const DEFAULT_CONFIG: Configuration = {
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
  return {
    'Task Name': 'Test Task',
    Description: 'Test task description',
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'NOT_STARTED',
    ...overrides,
  };
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

interface MockBackendApi {
  cancelPipeline: jest.Mock;
}

interface MockBackend {
  getProjectId: jest.Mock<number>;
  api: MockBackendApi;
  init?: jest.Mock;
  getPipelineStatus?: jest.Mock;
}

export function createMockBackend(projectId: number = 1): MockBackend {
  return {
    getProjectId: jest.fn().mockReturnValue(projectId),
    api: {
      cancelPipeline: jest.fn().mockResolvedValue(undefined),
    },
    init: jest.fn().mockResolvedValue(undefined),
    getPipelineStatus: jest.fn(),
  };
}

export function createMockStoreState(settings: {
  RUNNER_TAG: string;
  BRANCH_NAME: string;
  GROUP_NAME?: string;
  DT_DIRECTORY?: string;
  COMMON_LIBRARY_PROJECT_NAME?: string;
}): MeasurementStoreState {
  return {
    settings: {
      RUNNER_TAG: settings.RUNNER_TAG,
      BRANCH_NAME: settings.BRANCH_NAME,
      GROUP_NAME: settings.GROUP_NAME ?? 'dtaas',
      DT_DIRECTORY: settings.DT_DIRECTORY ?? 'digital_twins',
      COMMON_LIBRARY_PROJECT_NAME:
        settings.COMMON_LIBRARY_PROJECT_NAME ?? 'common',
      trials: 3,
      secondaryRunnerTag: 'windows',
      primaryDTName: 'hello-world',
      secondaryDTName: 'mass-spring-damper',
      disabledTaskNames: [],
    },
  };
}

export function createMockActivePipeline(
  overrides: Partial<{
    backend: MockBackend;
    pipelineId: number;
    dtName: string;
    status: string;
    phase: 'parent' | 'child';
  }> = {},
): ActivePipeline {
  const mockBackend = overrides.backend ?? createMockBackend();
  return {
    backend: mockBackend as unknown as BackendInterface,
    pipelineId: overrides.pipelineId ?? 100,
    dtName: overrides.dtName ?? 'test-dt',
    config: DEFAULT_CONFIG,
    status: overrides.status ?? 'running',
    phase: overrides.phase ?? 'parent',
  };
}

export interface MockMeasurementSetters {
  setIsRunning: jest.Mock;
  setCurrentExecutions: jest.Mock;
  setCurrentTaskIndex: jest.Mock;
  setResults: jest.Mock;
}

export function createMockSetters(resultsStateRef: {
  current: TimedTask[];
}): MockMeasurementSetters {
  return {
    setIsRunning: jest.fn(),
    setCurrentExecutions: jest.fn(),
    setCurrentTaskIndex: jest.fn(),
    setResults: jest.fn((updater: React.SetStateAction<TimedTask[]>) => {
      if (typeof updater === 'function') {
        resultsStateRef.current = updater(resultsStateRef.current || []);
      } else {
        resultsStateRef.current = updater;
      }
    }),
  };
}

// --- Shared test harness for measurement.runner and measurement.lifecycle tests ---

export interface TestMeasurementState {
  shouldStopPipelines: boolean;
  activePipelines: unknown[];
  executionResults: unknown[];
  currentMeasurementPromise: Promise<void> | null;
  currentTrialMinPipelineId: number | null;
  isRunning: boolean;
  results: TimedTask[] | null;
  currentTaskIndexUI: number | null;
  componentSetters: MeasurementSetters | null;
}

const CLEAN_STATE: Omit<TestMeasurementState, 'componentSetters'> = {
  shouldStopPipelines: false,
  activePipelines: [],
  executionResults: [],
  currentMeasurementPromise: null,
  currentTrialMinPipelineId: null,
  isRunning: false,
  results: null,
  currentTaskIndexUI: null,
};

export function resetMeasurementState(state: TestMeasurementState) {
  Object.assign(state, { ...CLEAN_STATE, componentSetters: null });
}

export function initMeasurementResults(resultsRef: { current: TimedTask[] }) {
  resultsRef.current = getTasks().map((t) => ({
    ...t,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'PENDING' as const,
  }));
}

/**
 * Common beforeEach setup for measurement runner/lifecycle tests.
 * Returns { state, setters, isRunningRef, resultsRef }.
 */
export function setupMeasurementTestHarness() {
  const state = measurementState as unknown as TestMeasurementState;
  const resultsRef: { current: TimedTask[] } = { current: [] };
  const setters = createMockSetters(resultsRef);
  const isRunningRef: React.MutableRefObject<boolean> = { current: false };
  const mockMeasurementConfig =
    measurementConfig as unknown as MockMeasurementConfig;

  const reset = () => {
    jest.clearAllMocks();
    resetMeasurementState(state);
    mockMeasurementConfig.trials = 3;
    resultsRef.current = [];
    isRunningRef.current = false;
    state.componentSetters = setters;
    state.results = null;
    initMeasurementResults(resultsRef);
  };

  return {
    state,
    setters,
    isRunningRef,
    resultsRef,
    mockMeasurementConfig,
    reset,
  };
}
