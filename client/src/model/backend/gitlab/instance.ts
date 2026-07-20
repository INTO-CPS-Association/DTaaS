/**
 * GitlabInstance class provides and maintains information about the project it is tied to,
 * as well as library (common) project information, by communicating with an associated backend API.
 * It provides methods to initialize the instance, retrieve project IDs, and manage execution logs.
 */
import {
  getGroupName,
  getCommonLibraryProjectName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import GitlabAPI from 'model/backend/gitlab/backend';
import {
  BackendInterface,
  LogEntry,
  ProjectId,
  JobSummary,
  ProjectSummary,
} from 'model/backend/interfaces/backendInterfaces';
import { Pipeline } from 'model/backend/interfaces/execution';

const normalizeProjectKey = (value: string | undefined): string =>
  value?.toLowerCase() ?? '';

function getNamespaceProjectPath(project: ProjectSummary): string | undefined {
  return project.path_with_namespace?.split('/').pop();
}

function projectMatches(project: ProjectSummary, projectName: string): boolean {
  const expected = normalizeProjectKey(projectName);
  const candidates = [
    project.path,
    getNamespaceProjectPath(project),
    project.name,
  ];

  return candidates.some(
    (candidate) => normalizeProjectKey(candidate) === expected,
  );
}

function findProject(
  projects: ProjectSummary[],
  projectName: string,
): ProjectSummary | null {
  return (
    projects.find((project) => projectMatches(project, projectName)) ?? null
  );
}

export class GitlabInstance implements BackendInterface {
  public projectName: string;

  public api: GitlabAPI;

  public logs: LogEntry[];

  // Defined during initialization
  private projectId!: ProjectId;

  public commonProjectId!: ProjectId;

  private triggerToken: string | null = null;

  public constructor(projectName: string, backendApi: GitlabAPI) {
    this.projectName = projectName;
    this.api = backendApi;
    this.logs = [];
  }

  public async init() {
    await this.setProjectIds();
    this.triggerToken = await this.api.getTriggerToken(this.projectId);
    if (!this.triggerToken) {
      throw new Error('Trigger token not found');
    }
  }

  public async startPipeline(
    projectId: ProjectId,
    ref: string,
    variables?: Record<string, string>,
  ): Promise<Pipeline> {
    if (!this.triggerToken) {
      throw new Error('Trigger token is not set');
    }
    return this.api.startPipeline(projectId, ref, variables, this.triggerToken);
  }

  private async setProjectIds(): Promise<void> {
    const group = await this.api.getGroupByName(getGroupName());
    const projects = await this.api.listGroupProjects(group.id as string);
    const project = findProject(projects, this.projectName);
    const commonProject = findProject(projects, getCommonLibraryProjectName());

    if (!project) {
      throw new Error(`Project ${this.projectName} not found`);
    }

    if (!commonProject) {
      throw new Error(
        `Common project ${getCommonLibraryProjectName()} not found`,
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

  public getExecutionLogs(): LogEntry[] {
    return this.logs;
  }

  public async getPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]> {
    return this.api.listPipelineJobs(projectId, pipelineId);
  }

  public async getJobTrace(projectId: number, jobId: number): Promise<string> {
    return this.api.getJobLog(projectId, jobId);
  }

  public async getPipelineStatus(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<string> {
    return this.api.getPipelineStatus(projectId, pipelineId);
  }

  public getTriggerToken(): string | null {
    return this.triggerToken;
  }
}

export default GitlabInstance;
