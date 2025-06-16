export type JobName = string;
export type LogContent = string;

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMEOUT = 'timeout',
}

export interface JobLog {
  jobName: JobName;
  log: LogContent;
}
