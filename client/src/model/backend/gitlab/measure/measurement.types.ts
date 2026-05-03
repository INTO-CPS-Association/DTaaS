/**
 * Pure types for the measurement module. No runtime state or side effects.
 *
 * Used by measurement.execution.ts, measurement.settings.ts, and most other
 * files in this directory.
 */
import type { Configuration as ExternalConfiguration } from 'model/backend/gitlab/execution/executionTypes';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';

export type MeasurementStoreState = {
  settings: {
    RUNNER_TAG: string;
    BRANCH_NAME: string;
    GROUP_NAME: string;
    DT_DIRECTORY: string;
    COMMON_LIBRARY_PROJECT_NAME: string;
    trials: number;
    secondaryRunnerTag: string;
    primaryDTName: string;
    secondaryDTName: string;
    disabledTaskNames: string[];
  };
};

export type MeasurementStore = {
  getState: () => MeasurementStoreState;
  restoreRunnerTag: (value: string) => void;
  restoreBranchName: (value: string) => void;
  restoreSecondaryRunnerTag: (value: string) => void;
  showSnackbar: (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning',
  ) => void;
};

export type Configuration = ExternalConfiguration;

export type Status =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'RUNNING'
  | 'FAILURE'
  | 'SUCCESS'
  | 'STOPPED';

export type ExecutionResult = {
  dtName: string;
  pipelineId: number | null;
  status: string;
  config: Configuration;
  executionIndex?: number;
};

export type ActivePipeline = {
  backend: BackendInterface;
  pipelineId: number;
  dtName: string;
  config: Configuration;
  status: string;
  phase: 'parent' | 'child';
  executionIndex?: number;
};

export type TrialError = { message: string; error: Error } | undefined;

export type TimeStamp = Date | undefined;

export type Trial = {
  'Time Start': TimeStamp;
  'Time End': TimeStamp;
  Execution: ExecutionResult[];
  Status: Status;
  Error: TrialError;
};

export type TaskFunction = (
  runDigitalTwin: (
    name: string,
    config?: Partial<Configuration>,
  ) => Promise<ExecutionResult>,
) => Promise<ExecutionResult[]>;

export type Execution = {
  dtName: string;
  config: Partial<Configuration>;
};

export type TimedTask = {
  'Task Name': string;
  Description: string;
  Trials: Trial[];
  'Time Start': TimeStamp;
  'Time End': TimeStamp;
  'Average Time (s)': number | undefined;
  Status: Status;
  ExpectedTrials?: number;
  Executions?: () => Execution[];
};

export type MeasurementRecord = {
  id: string;
  taskName: string;
  timestamp: number;
  task: TimedTask;
};

export type MeasurementSetters = {
  setIsRunning: (v: boolean) => void;
  setCurrentExecutions: (v: ExecutionResult[]) => void;
  setCurrentTaskIndex: (v: number | null) => void;
  setResults: (
    value: TimedTask[] | ((prev: TimedTask[]) => TimedTask[]),
  ) => void;
};
