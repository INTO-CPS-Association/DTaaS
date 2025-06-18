import { Gitlab } from '@gitbeaker/rest';
import {
  BackendAPI,
  ProjectId,
  Pipeline,
  RepositoryFile,
  RepositoryTreeItem,
  ProjectSummary,
  JobSummary,
  PipelineStatus,
  GitLabPipelineStatus,
} from './UtilityInterfaces';

export class GitlabAPI implements BackendAPI {
  readonly client: InstanceType<typeof Gitlab>;

  private triggerToken: string | null = null;

  public constructor(host: string, oauthToken: string) {
    this.client = new Gitlab({ host, oauthToken });
  }

  public async init(projectId: ProjectId): Promise<void> {
    this.triggerToken = await this.getTriggerToken(projectId);
    if (!this.triggerToken) {
      throw new Error('Trigger token not found');
    }
  }

  public async startPipeline(
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

  public async cancelPipeline(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<Pipeline> {
    const response = await this.client.Pipelines.cancel(projectId, pipelineId);
    return { id: response.id };
  }

  public async createRepositoryFile(
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

  public async editRepositoryFile(
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

  public async removeRepositoryFile(
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

  public async getRepositoryFileContent(
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

  public async listRepositoryFiles(
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

  public async getGroupByName(groupName: string): Promise<ProjectSummary> {
    return this.client.Groups.show(groupName);
  }

  public async listGroupProjects(groupId: string): Promise<ProjectSummary[]> {
    return this.client.Groups.allProjects(groupId);
  }

  public async listPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]> {
    return this.client.Jobs.all(projectId, { pipelineId });
  }

  public async getJobLog(projectId: ProjectId, jobId: number): Promise<string> {
    return this.client.Jobs.showLog(projectId, jobId);
  }

  public async getPipelineStatus(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<PipelineStatus> {
    const pipeline = await this.client.Pipelines.show(projectId, pipelineId);
    return pipeline.status as GitLabPipelineStatus;
  }

  // Unique function of GitLab backendApi
  public async getTriggerToken(projectId: ProjectId): Promise<string | null> {
    let token: string | null = null;

    const triggers = await this.client.PipelineTriggerTokens.all(projectId);

    if (triggers && triggers.length > 0) {
      token = triggers[0].token;
    }
    return token;
  }
}

export default GitlabAPI;
