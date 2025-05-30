import { Camelize, JobSchema, Gitlab } from '@gitbeaker/rest';
import {
  GROUP_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
} from 'model/backend/gitlab/constants';
import { BackendInterface, LogEntry, PipelineStatus } from './interfaces';

class GitlabInstance implements BackendInterface {
  public projectName: string;

  public api: InstanceType<typeof Gitlab>;

  public logs: LogEntry[];

  private projectId: number = 0; // Dummy value to enforce type

  public commonProjectId: number = 0; // Dummy value to enforce type

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
    await this.setProjectIds();
    this.triggerToken = await this.getTriggerToken(this.projectId);
  }

  private async setProjectIds(): Promise<void> {
    const group = await this.api.Groups.show(GROUP_NAME);
    const projects = await this.api.Groups.allProjects(group.id);
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

  public getProjectId(): number {
    return this.projectId;
  }

  public getCommonProjectId(): number {
    return this.commonProjectId;
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
}

export default GitlabInstance;
