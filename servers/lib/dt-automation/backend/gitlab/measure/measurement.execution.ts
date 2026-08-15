/**
 * Runtime state, setters, session persistence, and task helpers.
 *
 * Central module for mutable measurement state. measurement.runner.ts drives
 * execution; measurement.pipeline.ts handles individual pipeline operations.
 */
import { taskDefinitions } from 'model/backend/gitlab/measure/tasks';
import type {
  MeasurementSetters,
  ActivePipeline,
  ExecutionResult,
  TimedTask,
  Status,
} from './measurement.types';
import {
  saveOriginalSettings as _saveOriginalSettings,
  restoreOriginalSettings as _restoreOriginalSettings,
} from './measurement.settings';

export type {
  MeasurementSetters,
  MeasurementStoreState,
  ActivePipeline,
  ExecutionResult,
  TimedTask,
  Status,
  Configuration,
  TrialError,
  TimeStamp,
  Trial,
  TaskFunction,
  Execution,
  MeasurementStore,
} from './measurement.types';
export {
  setMeasurementStore,
  getStore,
  measurementConfig,
  getDefaultConfig,
} from './measurement.settings';

export const measurementState = {
  shouldStopPipelines: false,
  activePipelines: [] as ActivePipeline[],
  executionResults: [] as ExecutionResult[],
  currentMeasurementPromise: null as Promise<void> | null,
  currentTrialMinPipelineId: null as number | null,
  currentTrialExecutionIndex: 0,

  isRunning: false,
  isRunningRef: { current: false } as { current: boolean },
  results: null as TimedTask[] | null,
  currentTaskIndexUI: null as number | null,
  componentSetters: null as MeasurementSetters | null,
  originalPrimaryRunnerTag: null as string | null,
  originalSecondaryRunnerTag: null as string | null,
  restoredAfterRefresh: false,
};

// Restore results from sessionStorage so completed progress survives a page refresh.
// Running tasks are marked STOPPED because the execution context (promises, pipelines) is lost.
try {
  const saved = sessionStorage.getItem('measurementResults');
  if (saved) {
    const DATE_KEYS = new Set(['Time Start', 'Time End']);
    const parsed: TimedTask[] = JSON.parse(saved, (key, value) =>
      DATE_KEYS.has(key) && typeof value === 'string' ? new Date(value) : value,
    );
    const tasksByName = new Map(
      taskDefinitions.map((def) => [def.name, def.executions]),
    );
    const isActive = (s: Status) => s === 'RUNNING' || s === 'PENDING';
    const markStopped = (s: Status): Status => (isActive(s) ? 'STOPPED' : s);
    const hadRunningTasks = parsed.some((task) => isActive(task.Status));
    measurementState.results = parsed.map((task) => ({
      ...task,
      Status: markStopped(task.Status),
      Trials: task.Trials.map((trial) => ({
        ...trial,
        Status: markStopped(trial.Status),
      })),
      Executions: tasksByName.has(task['Task Name'])
        ? tasksByName.get(task['Task Name'])
        : undefined,
    }));
    measurementState.isRunning = false;
    measurementState.restoredAfterRefresh = hadRunningTasks;
  }
} catch {
  // ignore parse errors — start fresh
}

// Save the page's update functions so the runner can refresh what the user sees
export function attachSetters(setters: MeasurementSetters): void {
  measurementState.componentSetters = setters;
}

// Forget the page's update functions when the user leaves the page
export function detachSetters(): void {
  measurementState.componentSetters = null;
}

const RESULTS_STORAGE_KEY = 'measurementResults';

function persistResults(): void {
  try {
    if (!measurementState.results) return;
    const serializable = measurementState.results.map(
      ({ Executions: _Executions, ...rest }) => rest,
    );
    sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // ignore quota errors
  }
}

export function clearPersistedResults(): void {
  sessionStorage.removeItem(RESULTS_STORAGE_KEY);
}

// Wraps update functions so every change is saved in memory AND shown on screen.
// If the user navigated away, the screen update is skipped but the data is still saved.
export function wrapSetters(): MeasurementSetters {
  return {
    setIsRunning: (v: boolean) => {
      measurementState.isRunning = v;
      measurementState.componentSetters?.setIsRunning(v);
    },
    setCurrentExecutions: (v: ExecutionResult[]) => {
      measurementState.componentSetters?.setCurrentExecutions(v);
    },
    setCurrentTaskIndex: (v: number | null) => {
      measurementState.currentTaskIndexUI = v;
      measurementState.componentSetters?.setCurrentTaskIndex(v);
    },
    setResults: (v: TimedTask[] | ((prev: TimedTask[]) => TimedTask[])) => {
      if (typeof v === 'function') {
        measurementState.results = v(measurementState.results ?? []);
      } else {
        measurementState.results = v;
      }
      measurementState.componentSetters?.setResults(v);
      persistResults();
    },
  };
}

export function saveOriginalSettings(): void {
  const tags = _saveOriginalSettings();
  if (tags) {
    measurementState.originalPrimaryRunnerTag = tags.primaryRunnerTag;
    measurementState.originalSecondaryRunnerTag = tags.secondaryRunnerTag;
  }
}

export function restoreOriginalSettings(): void {
  _restoreOriginalSettings();
  measurementState.originalPrimaryRunnerTag = null;
  measurementState.originalSecondaryRunnerTag = null;
}

export const DEFAULT_TASK: TimedTask = {
  'Task Name': '',
  Description: '',
  Trials: [],
  'Time Start': undefined,
  'Time End': undefined,
  'Average Time (s)': undefined,
  Status: 'NOT_STARTED',
};

let tasks: readonly TimedTask[] | undefined;
export function getTasks(): readonly TimedTask[] {
  tasks ??= taskDefinitions.map((def) => ({
    ...DEFAULT_TASK,
    'Task Name': def.name,
    Description: def.description,
    Executions: def.executions,
  }));
  return tasks;
}

export function resetTasks(): TimedTask[] {
  return getTasks().map((task) => ({
    ...task,
    Trials: [],
    'Time Start': undefined,
    'Time End': undefined,
    'Average Time (s)': undefined,
    Status: 'NOT_STARTED' as const,
  }));
}
