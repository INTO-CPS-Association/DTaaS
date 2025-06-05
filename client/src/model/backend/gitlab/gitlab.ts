import {
  GROUP_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
} from 'model/backend/gitlab/constants';
import {
  BackendAPI,
  BackendInterface,
  LogEntry,
  PipelineStatus,
  ProjectId,
  JobSummary,
} from './interfaces';

export class GitlabInstance implements BackendInterface {
  public projectName: string;

  public api: BackendAPI;

  public logs: LogEntry[];

  private projectId: ProjectId = 0; // Dummy values to enforce type

  public commonProjectId: ProjectId = 0;

  constructor(projectName: string, backendApi: BackendAPI) {
    this.projectName = projectName;
    this.api = backendApi;
    this.logs = [];
  }

  async init() {
    await this.setProjectIds();
    await this.api.init(this.projectId);
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
    return this.api.getPipelineStatus(projectId, pipelineId);
  }
}

export default GitlabInstance;
