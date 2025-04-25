import { Camelize, JobSchema, Gitlab } from '@gitbeaker/rest';

export type PipelineStatus =
  | 'running'
  | 'pending'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'skipped'
  | 'manual';

export interface LogEntry {
  status: PipelineStatus | 'error';
  DTName: string;
  runnerTag: string;
  error?: Error;
}

export interface ProjectProvider {
  getProjectIds(): Promise<(number | null)[]>;
  getTriggerToken(projectId: number): Promise<string | null>;
}

interface PipelineProvider {
  getPipelineStatus(
    projectId: number,
    pipelineId: number,
  ): Promise<PipelineStatus>;
  getPipelineJobs(
    projectId: number,
    pipelineId: number,
  ): Promise<(JobSchema | Camelize<JobSchema>)[]>;
  getJobTrace(projectId: number, jobId: number): Promise<string>;
}

interface LogProvider {
  getLogs(): LogEntry[];
  executionLogs(): LogEntry[];
}

export interface BackendInterface
  extends ProjectProvider,
    PipelineProvider,
    LogProvider {
  projectName: string;
  api: InstanceType<typeof Gitlab>;
  logs: LogEntry[];
  projectId: number | null;
  commonProjectId: number | null;
  triggerToken: string | null;
  init(): Promise<void>;
}

export interface GitlabInterface extends BackendInterface {
  init(): Promise<void>;
}
