import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';

export interface PollOptions {
  shouldAbort?: () => boolean;
}

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMEOUT = 'timeout',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface JobLog {
  jobName: string;
  log: string;
}

export interface DigitalTwinPipelineState {
  pipelineId: number | null;
  lastExecutionStatus: ExecutionStatus | null;
  jobLogs: JobLog[];
  pipelineLoading: boolean;
  pipelineCompleted: boolean;
}

export type Pipeline = {
  id: number;
  status: string;
};

export type TriggerToken = {
  token: string;
};

/**
 * Interface for execution history operations
 * Abstracts away the underlying storage implementation
 */
export interface IExecutionHistory {
  init(): Promise<void>;
  add(entry: DTExecutionResult): Promise<string>;
  update(entry: DTExecutionResult): Promise<void>;
  getById(id: string): Promise<DTExecutionResult | null>;
  getByDTName(dtName: string): Promise<DTExecutionResult[]>;
  getAll(): Promise<DTExecutionResult[]>;
  delete(id: string): Promise<void>;
  deleteByDTName(dtName: string): Promise<void>;
}
