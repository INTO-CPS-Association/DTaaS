import { FileType } from './constants';
import { IFile } from '../interfaces/ifile';
import { DigitalTwinPipelineState } from './types/executionHistory';

// Instance
export type LogEntry = {
  status: string;
  DTName: string;
  runnerTag: string;
  error?: Error;
};

// Backend API return value interfaces
export type TriggerToken = {
  token: string;
};

export type JobSummary = {
  id: number;
  name: string;
  status: string;
};

export type Pipeline = {
  id: number;
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

export interface DigitalTwinDetails {
  DTName: string;
  description: string | undefined;
  fullDescription: string;
}

export interface DigitalTwinFiles {
  descriptionFiles: string[];
  configFiles: string[];
  lifecycleFiles: string[];
  assetFiles: { assetPath: string; fileNames: string[] }[];
}

export interface DigitalTwinCreator {
  create(
    files: FileState[],
    cartAssets: LibraryAssetInterface[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<string>;
}

export interface DigitalTwinExecutor {
  execute(): Promise<number | null>;
  stop(projectId: ProjectId, pipeline: string): Promise<void>;
}

export interface DigitalTwinDeleter {
  delete(): Promise<string>;
}

/**
 * Interface for providing descriptions of assets.
 * Used in both digital twins and library assets.
 */
export interface DescriptionProvider {
  /**
   * Fetches the description.md content for the digital twin.
   * @returns A promise that resolves when the description is fetched.
   */
  getDescription(): Promise<void>;
  /**
   * Fetches the README.md content for the digital twin.
   * @returns A promise that resolves when the full description is fetched.
   */
  getFullDescription(): Promise<void>;
}

export interface DigitalTwinFileProvider {
  getDescriptionFiles(): Promise<void>;
  getConfigFiles(): Promise<void>;
  getLifecycleFiles(): Promise<void>;
  getAssetFiles(): Promise<{ assetPath: string; fileNames: string[] }[]>;
}

/**
 * Interface for managing digital twins, including details, pipeline state, files, and operations.
 * @extends DigitalTwinDetails
 * @extends DigitalTwinPipelineState
 * @extends DigitalTwinFiles
 * @extends DigitalTwinCreator
 * @extends DigitalTwinExecutor
 * @extends DigitalTwinDeleter
 * @extends DescriptionProvider
 * @extends DigitalTwinFileProvider
 */
export interface DigitalTwinInterface
  extends DigitalTwinDetails,
    DigitalTwinPipelineState,
    DigitalTwinFiles,
    DigitalTwinCreator,
    DigitalTwinExecutor,
    DigitalTwinDeleter,
    DescriptionProvider,
    DigitalTwinFileProvider {
  backend: BackendInterface;
  DTAssets: DTAssetsInterface;
}

// ifile.ts
export type FileState = {
  name: string;
  content: string;
  isNew: boolean;
  isModified: boolean;
  type?: string;
  isFromCommonLibrary?: boolean;
};

// libraryConfigFile.slice.ts
export type LibraryConfigFile = {
  assetPath: string;
  fileName: string;
  fileContent: string;
  isNew: boolean;
  isModified: boolean;
  isPrivate: boolean;
};

// DTAssets.ts
export interface DTAssetsFileCreator {
  createFiles(
    files:
      | FileState[]
      | Array<{
          name: string;
          content: string;
          isNew: boolean;
          isFromCommonLibrary: boolean;
        }>,
    mainFolderPath: string,
    lifecycleFolderPath: string,
  ): Promise<void>;
}

export interface DTAssetsFileUpdater {
  updateFileContent(fileName: string, fileContent: string): Promise<void>;
}

export interface DTAssetsFolderProvider {
  getFolders(path: string): Promise<string[]>;
}

export interface DTAssetsFileProvider {
  getFileContent(fileName: string): Promise<string>;
  getFileNames(fileType: FileType): Promise<string[]>;
}

export interface DTAssetFileContentUpdater {
  updateLibraryFileContent(
    fileName: string,
    fileContent: string,
    assetPath: string,
  ): Promise<void>;
}

export interface DTAssetsLibraryFileProvider {
  getFilesFromAsset(
    assetPath: string,
    isPrivate: boolean,
  ): Promise<
    Array<{
      name: string;
      content: string;
      path: string;
      isPrivate: boolean;
    }>
  >;
  getLibraryFileContent(assetPath: string, fileName: string): Promise<string>;
  getLibraryConfigFileNames(filePath: string): Promise<string[]>;
}

export interface DTAssetsPipelineProvider {
  appendTriggerToPipeline(): Promise<string>;
  removeTriggerFromPipeline(): Promise<string>;
}

export interface DTAssetsDeleter {
  delete(): Promise<void>;
}

/*
 * Interface for managing digital twin assets, including file creation, updates, and library management.
 */
export interface DTAssetsInterface
  extends DTAssetsFileCreator,
    DTAssetFileContentUpdater,
    DTAssetsFileProvider,
    DTAssetsFolderProvider,
    DTAssetsFileUpdater,
    DTAssetsLibraryFileProvider,
    DTAssetsPipelineProvider,
    DTAssetsDeleter {
  DTName: string;
  backend: BackendInterface;
  fileHandler: FileHandlerInterface;
}

// FileHandlerInterface.ts
export interface FileHandlerLibraryFileProvider {
  getLibraryFileNames(filePath: string, isPrivate: boolean): Promise<string[]>;
  getLibraryConfigFileNames(
    filePath: string,
    isPrivate: boolean,
  ): Promise<string[]>;
}

export interface FileHandlerFolderProvider {
  getFolders(path: string): Promise<string[]>;
}

/**
 * Interface for handling file operations within the DTaaS application.
 * @extends IFile
 * @extends FileHandlerLibraryFileProvider
 * @extends FileHandlerFolderProvider
 */
export interface FileHandlerInterface
  extends IFile,
    FileHandlerLibraryFileProvider,
    FileHandlerFolderProvider {
  name: string;
  backend: BackendInterface;
  /**
   * Create a file at the given path, committing with the provided message.
   * @param file - either an existing FileState, or an { name: string, content: string, isNew: boolean } object.
   * @param filePath - repository path (folder and filename) where the file will be created
   * @param commitMessage - the commit message to use when creating the file
   * @param commonProject - flag indicating if the file should be put in the library instead of the user's repo
   * @returns a promise that resolves once the create operation has completed
   */
  createFile(
    file: FileState | { name: string; content: string; isNew: boolean },
    filePath: string,
    commitMessage: string,
    commonProject?: boolean,
  ): Promise<void>;

  /**
   * Fetch the full text content of a file from the given path.
   * @param filePath - the path (folder and filename) of the file to retrieve
   * @param optional flag indicating if the file is private (default is true)
   * @returns a promise resolving to the file’s content as a string
   */
  getFileContent(filePath: string, isPrivate?: boolean): Promise<string>;
}

// libraryAsset.ts
export type LibraryAssetDetails = {
  /**
   * Name of the library asset
   */
  name: string;
  /**
   * Path to the library asset in the repository
   */
  description: string;
  /**
   * Full path to the library asset in the repository
   */
  fullDescription: string;
};

export type LibraryAssetFiles = {
  path: string;
  type: string;
  isPrivate: boolean;
  configFiles: string[];
};

export interface LibraryAssetFileProvider {
  getConfigFiles(): Promise<void>;
}

/**
 * Interface for managing library assets, including details, files, and descriptions.
 * @extends LibraryAssetDetails
 * @extends LibraryAssetFiles
 * @extends DescriptionProvider
 * @extends LibraryAssetFileProvider
 */
export interface LibraryAssetInterface
  extends LibraryAssetDetails,
    LibraryAssetFiles,
    DescriptionProvider,
    LibraryAssetFileProvider {
  /**
   * The backend provider instance
   */
  backend: BackendInterface;
  /**
   * The file handler instance for managing files related to the library asset
   */
  libraryManager: LibraryManagerInterface;
}

// LibraryManager.ts
export interface LibraryManagerDetails {
  assetName: string;
}

export interface FileContentProvider {
  getFileContent(
    isPrivate: boolean,
    path: string,
    fileName: string,
  ): Promise<string>;
}

export interface FileNamesProvider {
  getFileNames(isPrivate: boolean, path: string): Promise<string[]>;
}

/**
 * Interface for managing library assets, including file content retrieval and file name listing.
 */
export interface LibraryManagerInterface
  extends FileContentProvider,
    FileNamesProvider,
    LibraryManagerDetails {
  /**
   * The backend provider instance
   */
  backend: BackendInterface;
  /**
   * The file handler instance for managing files related to the library asset
   */
  fileHandler: FileHandlerInterface;
}
