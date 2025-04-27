import { Camelize, JobSchema, Gitlab } from '@gitbeaker/rest';
import {
  GROUP_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
} from 'model/backend/gitlab/constants';
import { GitlabInterface, LogEntry, PipelineStatus } from './interfaces';

class GitlabInstance implements GitlabInterface {
  public projectName: string;

  public api: InstanceType<typeof Gitlab>;

  public logs: LogEntry[];

  public projectId: number | null = null;

  public commonProjectId: number | null = null;

  public triggerToken: string | null = null;

  constructor(projectName: string, host: string, oauthToken: string) {
    this.projectName = projectName;
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

  // This should be deleted as it is already implemented.
  getLogs(): LogEntry[] {
    return this.logs;
  }
}

export default GitlabInstance;
