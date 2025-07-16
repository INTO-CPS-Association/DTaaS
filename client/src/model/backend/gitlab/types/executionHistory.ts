export type JobName = string;
export type LogContent = string;

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
  jobName: JobName;
  log: LogContent;
}

export interface DigitalTwinPipelineState {
  pipelineId: number | null;
  lastExecutionStatus: ExecutionStatus | null;
  jobLogs: JobLog[];
  pipelineLoading: boolean;
  pipelineCompleted: boolean;
}
