import { FileType } from './constants';
import { IFile } from '../interfaces/ifile';

// gitlab.ts
export type GitLabPipelineStatus =
  | 'running'
  | 'pending'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'skipped'
  | 'manual';

export type PipelineStatus = string;

export interface LogEntry {
  status: PipelineStatus;
  DTName: string;
  runnerTag: string;
  error?: Error;
}

// Minimal backend API return value interfaces
export interface TriggerToken {
  token: string;
}

export interface JobSummary {
  id: number;
  name: string;
  status: string;
}

export interface Pipeline {
  id: number;
  status?: string;
}

export interface RepositoryFile {
  content: string;
}

export interface RepositoryTreeItem {
  name: string;
  type: 'blob' | 'tree';
  path: string;
}

export interface ProjectSummary {
  id: number | string;
  name: string;
}

export type ProjectId = number | string;

// Interface for interacting with Gitlab-like APIs (Github, Azure DevOps, etc.)
export interface BackendAPI {
  init(projectId: ProjectId): Promise<void>;

  startPipeline(
    projectId: ProjectId,
    ref: string,
    variables?: Record<string, string>,
  ): Promise<Pipeline>;

  cancelPipeline(projectId: ProjectId, pipelineId: number): Promise<Pipeline>;

  createRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    content: string,
    commitMessage: string,
  ): Promise<RepositoryFile>;

  editRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    content: string,
    commitMessage: string,
  ): Promise<RepositoryFile>;

  removeRepositoryFile(
    projectId: ProjectId,
    filePath: string,
    branch: string,
    commitMessage: string,
  ): Promise<RepositoryFile>;

  getRepositoryFileContent(
    projectId: ProjectId,
    filePath: string,
    ref: string,
  ): Promise<RepositoryFile>;

  listRepositoryFiles(
    projectId: ProjectId,
    path?: string,
    ref?: string,
    recursive?: boolean,
  ): Promise<RepositoryTreeItem[]>;

  getGroupByName(groupName: string): Promise<ProjectSummary>;

  listGroupProjects(groupId: ProjectId): Promise<ProjectSummary[]>;

  listPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]>;

  getJobLog(projectId: ProjectId, jobId: number): Promise<string>;

  getPipelineStatus(projectId: ProjectId, pipelineId: number): Promise<string>;
}

export interface ProjectProvider {
  getProjectId(): ProjectId;
  getCommonProjectId(): ProjectId;
}

interface PipelineProvider {
  getPipelineStatus(
    projectId: ProjectId,
    pipelineId: ProjectId,
  ): Promise<PipelineStatus>;
  getPipelineJobs(
    projectId: ProjectId,
    pipelineId: number,
  ): Promise<JobSummary[]>;
  getJobTrace(projectId: ProjectId, jobId: number): Promise<string>;
}

interface LogProvider {
  getExecutionLogs(): LogEntry[];
}

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

export interface DigitalTwinPipelineState {
  pipelineId: number | null;
  lastExecutionStatus: string | null;
  jobLogs: { jobName: string; log: string }[];
  pipelineLoading: boolean;
  pipelineCompleted: boolean;
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

// Used both for LibraryAsset and DigitalTwin
export interface DescriptionProvider {
  getDescription(): Promise<void>;
  getFullDescription(): Promise<void>;
}

export interface DigitalTwinFileProvider {
  getDescriptionFiles(): Promise<void>;
  getConfigFiles(): Promise<void>;
  getLifecycleFiles(): Promise<void>;
  getAssetFiles(): Promise<{ assetPath: string; fileNames: string[] }[]>;
}

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
export interface FileState {
  name: string;
  content: string;
  isNew: boolean;
  isModified: boolean;
  type?: string;
  isFromCommonLibrary?: boolean;
}

// libraryConfigFile.slice.ts
export interface LibraryConfigFile {
  assetPath: string;
  fileName: string;
  fileContent: string;
  isNew: boolean;
  isModified: boolean;
  isPrivate: boolean;
}

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

export interface FileHandlerInterface
  extends IFile,
    FileHandlerLibraryFileProvider,
    FileHandlerFolderProvider {
  name: string;
  backend: BackendInterface;
  createFile(
    file: FileState | { name: string; content: string; isNew: boolean },
    filePath: string,
    commitMessage: string,
    commonProject?: boolean,
  ): Promise<void>;
  getFileContent(filePath: string, isPrivate?: boolean): Promise<string>;
}

// libraryAsset.ts
export interface LibraryAssetDetails {
  name: string; // Name of the library asset
  description: string; // The description.md content
  fullDescription: string; // The README.md content
}

export interface LibraryAssetFiles {
  path: string;
  type: string;
  isPrivate: boolean;
  configFiles: string[];
}

export interface LibraryAssetFileProvider {
  getConfigFiles(): Promise<void>;
}

export interface LibraryAssetInterface
  extends LibraryAssetDetails,
    LibraryAssetFiles,
    DescriptionProvider,
    LibraryAssetFileProvider {
  backend: BackendInterface;
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

export interface LibraryManagerInterface
  extends FileContentProvider,
    FileNamesProvider,
    LibraryManagerDetails {
  backend: BackendInterface;
  fileHandler: FileHandlerInterface;
}
