import { Camelize, Gitlab, JobSchema } from '@gitbeaker/rest';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_ID,
} from 'model/backend/gitlab/constants';
import { Asset } from '../components/asset/Asset';

export function mapStringToAssetPath(type: string): string | undefined {
  switch (type) {
    case 'Functions':
      return 'functions';
    case 'Models':
      return 'models';
    case 'Tools':
      return 'tools';
    case 'Data':
      return 'data';
    case 'Digital Twins':
      return 'digital_twins';
    default:
      return undefined;
  }
}

interface LogEntry {
  status: string;
  DTName: string;
  runnerTag: string;
  error?: Error;
}

class GitlabInstance {
  public username: string | null;

  public api: InstanceType<typeof Gitlab>;

  public logs: LogEntry[];

  public projectId: number | null = null;

  public triggerToken: string | null = null;

  constructor(username: string, host: string, oauthToken: string) {
    this.username = username;
    this.api = new Gitlab({
      host,
      oauthToken,
    });
    this.logs = [];
  }

  async init() {
    const projectId = await this.getProjectId();
    this.projectId = projectId;

    if (this.projectId !== null) {
      const token = await this.getTriggerToken(this.projectId);
      this.triggerToken = token;
    }
  }

  async getProjectId(): Promise<number | null> {
    let projectId: number | null = null;

    const group = await this.api.Groups.show(GROUP_NAME);
    const projects = await this.api.Groups.allProjects(group.id);
    const project = projects.find((proj) => proj.name === this.username);

    if (project) {
      projectId = project.id;
    }
    return projectId;
  }

  async getTriggerToken(projectId: number): Promise<string | null> {
    let token: string | null = null;

    const triggers = await this.api.PipelineTriggerTokens.all(projectId);

    if (triggers && triggers.length > 0) {
      token = triggers[0].token;
    }
    return token;
  }

  async getDTSubfolders(projectId: number): Promise<Asset[]> {
    const files = await this.api.Repositories.allRepositoryTrees(projectId, {
      path: DT_DIRECTORY,
      recursive: false,
    });

    const subfolders: Asset[] = await Promise.all(
      files
        .filter((file) => file.type === 'tree' && file.path !== DT_DIRECTORY)
        .map(async (file) => ({
          name: file.name,
          path: file.path,
          type: 'digitalTwin',
          isPrivate: true,
        })),
    );
    return subfolders;
  }

  async getLibrarySubfolders(
    projectId: number,
    type: string,
    isPrivate: boolean,
  ): Promise<Asset[]> {
    const mappedPath = mapStringToAssetPath(type);
    if (!mappedPath) {
      throw new Error(`Invalid asset type: ${type}`);
    }

    const projectToUse = isPrivate ? projectId : COMMON_LIBRARY_PROJECT_ID;

    const files = await this.api.Repositories.allRepositoryTrees(projectToUse, {
      path: mappedPath,
      recursive: false,
    });

    const subfolders: Asset[] = await Promise.all(
      files
        .filter((file) => file.type === 'tree' && file.path !== mappedPath)
        .map(async (file) => ({
          name: file.name,
          path: file.path,
          type,
          isPrivate,
        })),
    );

    return subfolders;
  }

  executionLogs(): LogEntry[] {
    return this.logs;
  }

  async getPipelineJobs(
    projectId: number,
    pipelineId: number,
  ): Promise<(JobSchema | Camelize<JobSchema>)[]> {
    const jobs = await this.api.Jobs.all(projectId, { pipelineId });
    return jobs;
  }

  async getJobTrace(projectId: number, jobId: number): Promise<string> {
    const log = await this.api.Jobs.showLog(projectId, jobId);
    return log;
  }

  async getPipelineStatus(
    projectId: number,
    pipelineId: number,
  ): Promise<string> {
    const pipeline = await this.api.Pipelines.show(projectId, pipelineId);
    return pipeline.status;
  }
}

export default GitlabInstance;
