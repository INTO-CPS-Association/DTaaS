import GitlabInstanceInterface, { LogEntry, PipelineStatus } from 'model/backend/gitlab/gitlab';
import { Camelize, Gitlab, JobSchema } from '@gitbeaker/rest';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  AssetTypes,
} from 'model/backend/gitlab/constants';
import { Asset } from 'preview/components/asset/Asset';

class GitlabInstance implements GitlabInstanceInterface {
  public projectName: string | null;

  public api: InstanceType<typeof Gitlab>;

  public logs: LogEntry[];

  public projectId: number | null = null;

  public commonProjectId: number | null = null;

  public triggerToken: string | null = null;

  constructor(username: string, host: string, oauthToken: string) {
    this.projectName = username;
    this.api = new Gitlab({
      host,
      oauthToken,
    });
    this.logs = [];
  }

  async init() {
    [this.projectId, this.commonProjectId] = await this.getProjectIds();

    if (this.projectId !== null) {
      this.triggerToken = await this.getTriggerToken(this.projectId);
    }
  }

  async getProjectIds(): Promise<(number | null)[]> {
    let projectId: number | null = null;
    let commonProjectId: number | null = null;

    const group = await this.api.Groups.show(GROUP_NAME);
    const projects = await this.api.Groups.allProjects(group.id);
    const project =
      projects.find((proj) => proj.name === this.projectName) || null;
    const commonProject =
      projects.find((proj) => proj.name === COMMON_LIBRARY_PROJECT_NAME) ||
      null;

    if (project) {
      projectId = project.id;
    }

    if (commonProject) {
      commonProjectId = commonProject.id;
    }
    return [projectId, commonProjectId];
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
          type: AssetTypes['Digital twin' as keyof typeof AssetTypes],
          isPrivate: true,
        })),
    );
    return subfolders;
  }

  async getLibrarySubfolders(
    projectId: number,
    type: keyof typeof AssetTypes,
    isPrivate: boolean,
  ): Promise<Asset[]> {
    const mappedPath = AssetTypes[type as keyof typeof AssetTypes];
    if (!mappedPath) {
      throw new Error(`Invalid asset type: ${type}`);
    }
    const projectToUse = isPrivate ? projectId : this.commonProjectId;
    if (projectToUse === null) {
      throw new Error('Project ID not found');
    }
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
  ): Promise<PipelineStatus> {
    const pipeline = await this.api.Pipelines.show(projectId, pipelineId);
    return pipeline.status as PipelineStatus;
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }
}

export default GitlabInstance;
