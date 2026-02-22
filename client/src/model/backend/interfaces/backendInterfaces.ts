import { Pipeline } from 'model/backend/interfaces/execution';

/**
 * Interface for interacting directly with Gitlab-like APIs (Github, Azure DevOps, etc.)
 */
export interface BackendAPI {
  /**
   * Starts a new pipeline for the specified project.
   * @param projectId - The ID of the project to start the pipeline for.
   * @param ref - The Git reference (branch/tag) to build.
   * @param variables - Optional variables to pass to the pipeline.
   * @returns A promise that resolves to the created pipeline.
   */
  startPipeline(
    projectId: ProjectId,
    ref: string,
    variables?: Record<string, string>,
  ): Promise<Pipeline>;

  /**
   * Cancels an existing pipeline.
   * @param projectId - The ID of the project containing the pipeline.
   * @param pipelineId - The ID of the pipeline to cancel.
   * @returns A promise that resolves to the canceled pipeline.
   */
  cancelPipeline(projectId: ProjectId, pipelineId: number): Promise<Pipeline>;

  /**
   * Creates a new file in the repository.
   * @param projectId - The ID of the project to create the file in.
   * @param filePath - The path where the file will be created.
   * @param branch - The branch where the file will be created.
   * @param content - The content of the file.
   * @param commitMessage - The commit message for the creation.
   * @returns A promise that resolves to the created repository file.
   */
  createRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    content: string,
    commitMessage: string,
  ): Promise<RepositoryFile>;

  /**
   * Edits an existing file in the repository.
   * @param projectId - The ID of the project containing the file.
   * @param filePath - The path of the file to edit.
   * @param branch - The branch where the file is located.
   * @param content - The new content for the file.
   * @param commitMessage - The commit message for the edit.
   * @returns A promise that resolves to the edited repository file.
   */
  editRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    content: string,
    commitMessage: string,
  ): Promise<RepositoryFile>;

  /**
   * Removes a file from the repository.
   * @param projectId - The ID of the project containing the file.
   * @param filePath - The path of the file to remove.
   * @param branch - The branch where the file is located.
   * @param commitMessage - The commit message for the removal.
   * @returns A promise that resolves to the removed repository file.
   */
  removeRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    commitMessage: string,
  ): Promise<RepositoryFile>;

  /**
   * Retrieves the content of a file in the repository.
   * @param projectId - The ID of the project containing the file.
   * @param filePath - The path of the file to retrieve.
   * @param ref - The Git reference (branch/tag) to retrieve the file from.
   * @returns A promise that resolves to the repository file content.
   */
  getRepositoryFileContent(
    projectId: ProjectId,
    filePath: string,
    ref: string,
  ): Promise<RepositoryFile>;

  /**
   * Lists files in a repository directory.
   * @param projectId - The ID of the project to list files from.
   * @param path - The path of the directory to list files from.
   * @param ref - The Git reference (branch/tag) to list files from.
   * @param recursive - Whether to list files recursively.
   * @returns A promise that resolves to an array of repository tree items.
   */
  listRepositoryFiles(
    projectId: ProjectId,
    path?: string,
    ref?: string,
    recursive?: boolean,
  ): Promise<RepositoryTreeItem[]>;

  /**
   * Retrieves the group by its name.
   * @param groupName - The name of the group to retrieve.
   * @returns A promise that resolves to the project summary of the group.
   */
  getGroupByName(groupName: string): Promise<ProjectSummary>;

  /**
   * Lists all projects in a group.
   * @param groupId - The ID of the group to list projects from.
   * @returns A promise that resolves to an array of project summaries.
   */
  listGroupProjects(groupId: ProjectId): Promise<ProjectSummary[]>;

  /**
   * Lists all jobs in a pipeline.
   * @param projectId - The ID of the project containing the pipeline.
   * @param pipelineId - The ID of the pipeline to list jobs from.
   * @returns A promise that resolves to an array of job summaries.
   */
  listPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]>;

  /**
   * Retrieves the log of a specific job in a pipeline.
   * @param projectId - The ID of the project containing the job.
   * @param jobId - The ID of the job to retrieve the log for.
   * @returns A promise that resolves to the job log as a string.
   */
  getJobLog(projectId: ProjectId, jobId: number): Promise<string>;

  /**
   * Retrieves the status of a specific pipeline.
   * @param projectId - The ID of the project containing the pipeline.
   * @param pipelineId - The ID of the pipeline to retrieve the status for.
   * @returns A promise that resolves to the pipeline status as a string.
   */
  getPipelineStatus(projectId: ProjectId, pipelineId: number): Promise<string>;

  /**
   * Creates a single commit with multiple file actions (create, update, delete).
   * @param projectId - The ID of the project.
   * @param branch - The branch to commit to.
   * @param commitMessage - The commit message.
   * @param actions - Array of file actions to include in the commit.
   * @returns A promise that resolves when the commit is created.
   */
  commitMultipleActions(
    projectId: ProjectId,
    branch: string,
    commitMessage: string,
    actions: CommitAction[],
  ): Promise<void>;
}

export interface ProjectProvider {
  getProjectId(): ProjectId;
  getCommonProjectId(): ProjectId;
}

interface PipelineProvider {
  startPipeline(
    projectId: ProjectId,
    ref: string,
    variables?: Record<string, string>,
  ): Promise<Pipeline>;
  getPipelineStatus(
    projectId: ProjectId,
    pipelineId: ProjectId,
  ): Promise<string>;
  getPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]>;
  getJobTrace(projectId: ProjectId, jobId: number): Promise<string>;
}

interface LogProvider {
  getExecutionLogs(): LogEntry[];
}

/**
 * Interface for holding backend related information, including project details, BackendAPI instance, and logs.
 * Also may be used to start pipelines.
 * @extends ProjectProvider
 * @extends PipelineProvider
 * @extends LogProvider
 */
export interface BackendInterface
  extends ProjectProvider,
    PipelineProvider,
    LogProvider {
  projectName: string;
  api: BackendAPI;
  logs: LogEntry[];
  init(): Promise<void>;
}

// Instance
export type LogEntry = {
  status: string;
  DTName: string;
  runnerTag: string;
  error?: Error;
};

// Backend API return value interfaces
export type CommitAction = {
  action: 'create' | 'update' | 'delete';
  filePath: string;
  content?: string;
};

export type JobSummary = {
  id: number;
  name: string;
  status: string;
};

export type RepositoryFile = {
  content: string;
};

export type RepositoryTreeItem = {
  name: string;
  type: 'blob' | 'tree';
  path: string;
};

export type ProjectSummary = {
  id: number | string;
  name: string;
};

export type ProjectId = number | string;
