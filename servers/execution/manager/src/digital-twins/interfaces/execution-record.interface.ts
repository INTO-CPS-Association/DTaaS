export type JobLogRecord = {
  jobName: string;
  log: string;
};

export type ExecutionRecord = {
  id: string;
  dtName: string;
  pipelineId: number;
  /** Milliseconds since the epoch at which the execution was started. */
  timestamp: number;
  status: string;
  jobLogs: JobLogRecord[];
};
