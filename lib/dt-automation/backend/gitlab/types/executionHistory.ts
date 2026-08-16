import { ExecutionStatus } from 'model/backend/interfaces/execution';

export interface JobLog {
  jobName: string;
  log: string;
}

export interface DTExecutionResult {
  id: string;
  dtName: string;
  pipelineId: number;
  timestamp: number;
  status: ExecutionStatus;
  jobLogs: JobLog[];
}

export type ExecutionHistoryEntry = DTExecutionResult;
