import { Camelize, JobSchema } from '@gitbeaker/rest';
import { Asset } from 'preview/components/asset/Asset';
import { AssetTypes } from './constants';

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

interface ProjectProvider {
  getProjectIds(): Promise<(number | null)[]>;
  getTriggerToken(projectId: number): Promise<string | null>;
}

interface AssetProvider {
  getDTSubfolders(projectId: number): Promise<Asset[]>;
  getLibrarySubfolders(
    projectId: number,
    type: keyof typeof AssetTypes,
    isPrivate: boolean,
  ): Promise<Asset[]>;
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
}

export interface GitlabInstanceInterface
  extends ProjectProvider,
    AssetProvider,
    PipelineProvider,
    LogProvider {
  init(): Promise<void>;
}

export default GitlabInstanceInterface;
