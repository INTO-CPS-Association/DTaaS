import { /* Camelize, JobSchema, */ Gitlab } from '@gitbeaker/rest';
import {
  GROUP_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
} from 'model/backend/gitlab/constants';
import {
  backendApi as backendAPI,
  BackendInterface,
  LogEntry,
  PipelineStatus,
  Pipeline,
  RepositoryFile,
  RepositoryTreeItem,
  ProjectId,
  JobSummary,
  ProjectSummary,
  GitLabPipelineStatus,
} from './interfaces';

export class GitlabAPI implements backendAPI {
  private client: InstanceType<typeof Gitlab>;
  private triggerToken: string | null = null;

  constructor(host: string, token: string) {
    this.client = new Gitlab({ host, token });
    //this.triggerToken = triggerToken;
  }

  async init(projectId: ProjectId): Promise<void> {
    this.triggerToken = await this.getTriggerToken(projectId);
    if (!this.triggerToken) {
      throw new Error('Trigger token not found');
    }
  }

  async startPipeline(
    projectId: ProjectId,
    ref: string,
    variables?: Record<string, string>,
  ): Promise<Pipeline> {
    const response = await this.client.PipelineTriggerTokens.trigger(
      projectId,
      ref,
      this.triggerToken!,
      { variables },
    );
    return { id: response.id };
  }

  async cancelPipeline(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<Pipeline> {
    const response = await this.client.Pipelines.cancel(projectId, pipelineId);
    return { id: response.id };
  }

  async createRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    content: string,
    commitMessage: string,
  ): Promise<RepositoryFile> {
    await this.client.RepositoryFiles.create(
      projectId,
      filePath,
      branch,
      content,
      commitMessage,
    );
    return { content };
  }

  async editRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    content: string,
    commitMessage: string,
  ): Promise<RepositoryFile> {
    await this.client.RepositoryFiles.edit(
      projectId,
      filePath,
      branch,
      content,
      commitMessage,
    );
    return { content };
  }

  async removeRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    commitMessage: string,
  ): Promise<RepositoryFile> {
    await this.client.RepositoryFiles.remove(
      projectId,
      filePath,
      branch,
      commitMessage,
    );
    return { content: '' };
  }

  async getRepositoryFileContent(
    projectId: ProjectId,
    filePath: string,
    ref: string,
  ): Promise<RepositoryFile> {
    const response = await this.client.RepositoryFiles.show(
      projectId,
      filePath,
      ref,
    );
    const raw = Buffer.from(response.content, 'base64').toString('utf8');
    return { content: atob(raw) };
  }

  async listRepositoryFiles(
    projectId: ProjectId,
    path = '',
    ref = 'main',
    recursive = false,
  ): Promise<RepositoryTreeItem[]> {
    const items = await this.client.Repositories.allRepositoryTrees(projectId, {
      path,
      recursive,
      ref,
    });

    return items.map((item) => ({
      name: item.name,
      type: item.type as 'blob' | 'tree',
      path: item.path,
    }));
  }

  async getGroupByName(groupName: string): Promise<ProjectSummary> {
    return await this.client.Groups.show(groupName);
  }

  async listGroupProjects(groupId: string): Promise<ProjectSummary[]> {
    return await this.client.Groups.allProjects(groupId);
  }

  async listPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]> {
    const jobs = await this.client.Jobs.all(projectId, { pipelineId });
    return jobs;
  }

  async getJobLog(projectId: ProjectId, jobId: number): Promise<string> {
    return await this.client.Jobs.showLog(projectId, jobId);
  }

  async getPipelineStatus(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<PipelineStatus> {
    const pipeline = await this.client.Pipelines.show(projectId, pipelineId);
    return pipeline.status as GitLabPipelineStatus;
  }

  // Unique function of GitLab backendApi
  async getTriggerToken(projectId: ProjectId): Promise<string | null> {
    let token: string | null = null;

    const triggers = await this.client.PipelineTriggerTokens.all(projectId);

    if (triggers && triggers.length > 0) {
      token = triggers[0].token;
    }
    return token;
  }
}

class GitlabInstance implements BackendInterface {
  public projectName: string;

  public api: backendAPI;

  public logs: LogEntry[];

  private projectId: ProjectId = 0; // Dummy values to enforce type

  public commonProjectId: ProjectId = 0;

  constructor(projectName: string, backendApi: backendAPI) {
    this.projectName = projectName;
    this.api = backendApi;
    this.logs = [];
  }

  async init() {
    await this.setProjectIds();
  }

  private async setProjectIds(): Promise<void> {
    const group = await this.api.getGroupByName(GROUP_NAME);
    const projects = await this.api.listGroupProjects(group.id);
    const project =
      projects.find((proj) => proj.name === this.projectName) ?? null;
    const commonProject =
      projects.find((proj) => proj.name === COMMON_LIBRARY_PROJECT_NAME) ??
      null;

    if (!project) {
      throw new Error(`Project ${this.projectName} not found`);
    }

    if (!commonProject) {
      throw new Error(
        `Common project ${COMMON_LIBRARY_PROJECT_NAME} not found`,
      );
    }

    this.projectId = project.id;
    this.commonProjectId = commonProject.id;
  }

  public getProjectId(): ProjectId {
    return this.projectId;
  }

  public getCommonProjectId(): ProjectId {
    return this.commonProjectId;
  }

  executionLogs(): LogEntry[] {
    return this.logs;
  }

  async getPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]> {
    const jobs = await this.api.listPipelineJobs(projectId, pipelineId);
    return jobs;
  }

  async getJobTrace(projectId: number, jobId: number): Promise<string> {
    const log = await this.api.getJobLog(projectId, jobId);
    return log;
  }

  async getPipelineStatus(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<PipelineStatus> {
    return await this.api.getPipelineStatus(projectId, pipelineId);
  }
}

export default GitlabInstance;
