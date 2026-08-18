/**
 * GitlabAPI is a generalized interface to interact with select parts of GitLab's REST
 * API. It provides methods to manage pipelines, repository files related to a project,
 * and retrieve project information.
 */
import { Gitlab } from '@gitbeaker/rest';
import {
  BackendAPI,
  CommitAction,
  ProjectId,
  RepositoryFile,
  RepositoryTreeItem,
  ProjectSummary,
  JobSummary,
  PipelineBridge,
} from 'src/interfaces/backendInterfaces';
import { Pipeline } from 'src/interfaces/execution';
import { getBranchName } from 'src/gitlab/digitalTwinConfig/settingsUtility';
import { getGitlabStatus, retryGitlabRead } from 'src/gitlab/gitlabReadRetry';

type TriggerJob = {
  downstream_pipeline?: { id?: number } | null;
};

function normalizeTriggerJobs(jobs: TriggerJob[]): PipelineBridge[] {
  return jobs.map((job) => {
    const id = job.downstream_pipeline?.id;
    if (id != null && !Number.isInteger(id)) {
      throw new Error('GitLab returned an invalid downstream pipeline ID.');
    }
    return { downstreamPipelineId: id ?? null };
  });
}

export class GitlabAPI implements BackendAPI {
  public client: InstanceType<typeof Gitlab>;

  public constructor(host: string, oauthToken: string) {
    this.client = new Gitlab({ host, oauthToken });
  }

  private async read<T>(request: () => Promise<T>): Promise<T> {
    return retryGitlabRead(request);
  }

  public async startPipeline(
    projectId: ProjectId,
    ref: string,
    variables?: Record<string, string>,
    triggerToken?: string,
  ): Promise<Pipeline> {
    if (!triggerToken) {
      throw new Error('Trigger token is required to start a pipeline');
    }
    const response = await this.client.PipelineTriggerTokens.trigger(
      projectId,
      ref,
      triggerToken,
      { variables },
    );
    return { id: response.id, status: response.status };
  }

  public async cancelPipeline(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<Pipeline> {
    const response = await this.client.Pipelines.cancel(projectId, pipelineId);
    return { id: response.id, status: response.status };
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
    const response = await this.read(() =>
      this.client.RepositoryFiles.show(projectId, filePath, ref),
    );
    return { content: atob(response.content) };
  }

  public async listRepositoryFiles(
    projectId: ProjectId,
    path = '',
    ref = getBranchName(),
    recursive = false,
  ): Promise<RepositoryTreeItem[]> {
    const items = await this.read(() =>
      this.client.Repositories.allRepositoryTrees(projectId, {
        path,
        recursive,
        ref,
      }),
    );

    return items.map((item) => ({
      name: item.name,
      type: item.type as 'blob' | 'tree',
      path: item.path,
    }));
  }

  public async getGroupByName(groupName: string): Promise<ProjectSummary> {
    return this.read(() => this.client.Groups.show(groupName));
  }

  public async listGroupProjects(groupId: string): Promise<ProjectSummary[]> {
    return this.read(() => this.client.Groups.allProjects(groupId));
  }

  public async listPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]> {
    return this.read(() => this.client.Jobs.all(projectId, { pipelineId }));
  }

  public async getJobLog(projectId: ProjectId, jobId: number): Promise<string> {
    return this.read(() => this.client.Jobs.showLog(projectId, jobId));
  }

  public async getPipelineStatus(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<string> {
    const pipeline = await this.read(() =>
      this.client.Pipelines.show(projectId, pipelineId),
    );
    return pipeline.status;
  }

  public async getPipelineBridges(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<PipelineBridge[]> {
    try {
      const jobs = await this.getTriggerJobs(projectId, pipelineId);
      return normalizeTriggerJobs(jobs);
    } catch (error) {
      if (getGitlabStatus(error) !== 404) throw error;
      const bridges = await this.read(() =>
        this.client.Jobs.allPipelineBridges(projectId, pipelineId),
      );
      return normalizeTriggerJobs(bridges as TriggerJob[]);
    }
  }

  private async getTriggerJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<TriggerJob[]> {
    const encodedProjectId = encodeURIComponent(String(projectId));
    const endpoint = `projects/${encodedProjectId}/pipelines/${pipelineId}/trigger_jobs`;
    const response = await this.read(() =>
      this.client.Jobs.requester.get<TriggerJob[]>(endpoint),
    );
    return response.body;
  }

  public async commitMultipleActions(
    projectId: ProjectId,
    branch: string,
    commitMessage: string,
    actions: CommitAction[],
  ): Promise<void> {
    await this.client.Commits.create(projectId, branch, commitMessage, actions);
  }

  // Unique function of GitLab backendApi
  public async getTriggerToken(projectId: ProjectId): Promise<string | null> {
    let token: string | null = null;

    const triggers = await this.read(() =>
      this.client.PipelineTriggerTokens.all(projectId),
    );

    if (triggers && triggers.length > 0) {
      token = triggers[0].token;
    }
    return token;
  }
}

export default GitlabAPI;
