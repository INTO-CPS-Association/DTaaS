import { Camelize, JobSchema, Gitlab } from '@gitbeaker/rest';
import { FileType } from './constants';
import { IFile } from '../interfaces/ifile';

// gitlab.ts
export type PipelineStatus =
  | 'running'
  | 'pending'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'skipped'
  | 'manual';

export interface LogEntry {
  status: PipelineStatus | 'error';
  DTName: string;
  runnerTag: string;
  error?: Error;
}

export interface ProjectProvider {
  getProjectIds(): Promise<(number | null)[]>;
  getTriggerToken(projectId: number): Promise<string | null>;
}

interface PipelineProvider {
  getPipelineStatus(
    projectId: number,
    pipelineId: number,
  ): Promise<PipelineStatus>;
  getPipelineJobs(
    projectId: number,
    pipelineId: number,
  ): Promise<(JobSchema | Camelize<JobSchema>)[]>;
  getJobTrace(projectId: number, jobId: number): Promise<string>;
}

interface LogProvider {
  executionLogs(): LogEntry[];
}

export interface BackendInterface
  extends ProjectProvider,
    PipelineProvider,
    LogProvider {
  projectName: string;
  api: InstanceType<typeof Gitlab>;
  logs: LogEntry[];
  projectId: number;
  commonProjectId: number;
  triggerToken: string | null;
  init(): Promise<void>;
}

// digitalTwin.ts
export interface DigitalTwinLifecycleProvider {
  execute(): Promise<number | null>;
  stop(projectId: number, pipeline: string): Promise<void>;
  create(
    files: FileState[],
    cartAssets: LibraryAssetInterface[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<string>;
  delete(): Promise<string>;
}

export interface DigitalTwinDescriptionProvider {
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
  extends DigitalTwinLifecycleProvider,
    DigitalTwinDescriptionProvider,
    DigitalTwinFileProvider {
  DTName: string;
  description: string | undefined;
  fullDescription: string;
  gitlabInstance: BackendInterface;
  DTAssets: DTAssetsInterface;
  pipelineId: number | null;
  lastExecutionStatus: string | null;
  jobLogs: { jobName: string; log: string }[];
  pipelineLoading: boolean;
  pipelineCompleted: boolean;
  descriptionFiles: string[];
  configFiles: string[];
  lifecycleFiles: string[];
  assetFiles: { assetPath: string; fileNames: string[] }[];
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
export interface DTAssetsFileProvider {
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
  getFileContent(fileName: string): Promise<string>;
  getFileNames(fileType: FileType): Promise<string[]>;
  getFolders(path: string): Promise<string[]>;
  updateFileContent(fileName: string, fileContent: string): Promise<void>;
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
  updateLibraryFileContent(
    fileName: string,
    fileContent: string,
    assetPath: string,
  ): Promise<void>;
  getLibraryConfigFileNames(filePath: string): Promise<string[]>;
}

export interface DTAssetsPipelineProvider {
  appendTriggerToPipeline(): Promise<string>;
  removeTriggerFromPipeline(): Promise<string>;
}

export interface DTAssetsDeletionProvider {
  delete(): Promise<void>;
}

export interface DTAssetsInterface
  extends DTAssetsFileProvider,
    DTAssetsLibraryFileProvider,
    DTAssetsPipelineProvider,
    DTAssetsDeletionProvider {
  DTName: string;
  gitlabInstance: BackendInterface;
  fileHandler: FileHandlerInterface;
}

// FileHandlerInterface.ts
export interface FileHandlerInterface extends IFile {
  name: string;
  gitlabInstance: BackendInterface;
  getFileNames(fileType: FileType): Promise<string[]>;
  updateFile(
    filePath: string,
    updatedContent: string,
    commitMessage: string,
  ): Promise<void>;
  deleteDT(digitalTwinPath: string): Promise<void>;
  getFileNames(fileType: FileType): Promise<string[]>;
  getFileContent(filePath: string): Promise<string>;
  getFileContent(filePath: string, isPrivate?: boolean): Promise<string>;
  getLibraryFileNames(filePath: string, isPrivate: boolean): Promise<string[]>;
  getFolders(path: string): Promise<string[]>;
  createFile(
    file: FileState | { name: string; content: string; isNew: boolean },
    filePath: string,
    commitMessage: string,
    commonProject?: boolean,
  ): Promise<void>;
  getLibraryConfigFileNames(
    filePath: string,
    isPrivate: boolean,
  ): Promise<string[]>;
}

// libraryAsset.ts
export interface LibraryAssetDescriptionProvider {
  description: string;
  fullDescription: string;

  getDescription(): Promise<void>;
  getFullDescription(): Promise<void>;
}

export interface LibraryAssetFileProvider {
  configFiles: string[];
  getConfigFiles(): Promise<void>;
}

export interface LibraryAssetInterface
  extends LibraryAssetDescriptionProvider,
  LibraryAssetFileProvider {
  name: string;
  path: string;
  type: string;
  isPrivate: boolean;
  gitlabInstance: BackendInterface;
  description: string;
  fullDescription: string;
  libraryManager: LibraryManagerInterface;
  configFiles: string[];
}

// LibraryManager.ts
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
    FileNamesProvider {
  assetName: string;
  gitlabInstance: BackendInterface;
  fileHandler: FileHandlerInterface;
}
