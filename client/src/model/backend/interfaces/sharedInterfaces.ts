/**
 * Interfaces, types, enums that are backend agnostic and work on Digital Twin concepts.
 */

import {
  DigitalTwinPipelineState,
  ExecutionStatus,
} from 'model/backend/interfaces/execution';
import {
  ProjectId,
  BackendInterface,
  CommitAction,
} from 'model/backend/interfaces/backendInterfaces';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';

/**
 * Logical categories for Digital Twin files.
 * - Backend: used in fileHandler for extension checks and repo path resolution.
 * - Frontend: used to decide how files are displayed in the Editor/Preview.
 */
export enum FileType {
  DESCRIPTION = 'description',
  CONFIGURATION = 'configuration',
  LIFECYCLE = 'lifecycle',
}

/**
 * Project file state representation
 */
export type FileState = {
  name: string;
  content: string;
  isNew: boolean;
  isModified: boolean;
  type?: FileType;
  isFromCommonLibrary?: boolean;
};

export type LibraryAssetDetails = {
  /**
   * Name of the library asset.
   */
  name: string;
  /**
   * The asset's description provided to the user upon browsing assets (description.md).
   */
  description: string;
  /**
   * The asset's README.md shown when inspecting the asset.
   */
  fullDescription: string;
};

/**
 * Represents the metadata associated with a library asset.
 * Does not contain its content.
 */
export type LibraryAssetFiles = {
  path: string;
  type: string;
  isPrivate: boolean;
  configFiles: string[];
};

/*
  Interface for basic DTaaS file operations
  Utilized in FileHandlerInterface
*/
export interface IFile {
  /**
   * Creates a new file.
   * @param file - The file to be created.
   * @param filePath - The path where the file will be created.
   * @param commitMessage - The commit message for the file creation.
   */
  createFile(
    file: FileState,
    filePath: string,
    commitMessage: string,
  ): Promise<void>;
  /**
   * Updates an existing file.
   * @param filePath - The path of the file to be updated.
   * @param updatedContent - The new content for the file.
   * @param commitMessage - The commit message for the file update.
   */
  updateFile(
    filePath: string,
    updatedContent: string,
    commitMessage: string,
  ): Promise<void>;
  /**
   * Deletes a digital twin.
   * @param digitalTwinPath - The path of the digital twin to be deleted.
   */
  deleteDT(digitalTwinPath: string): Promise<void>;
  /**
   * Retrieves the content of a file.
   * @param filePath - The path of the file to be retrieved.
   */
  getFileContent(filePath: string): Promise<string>;
  /**
   * Retrieves the names of all files of a specific type.
   * @param fileType - The type of files to retrieve names for.
   */
  getFileNames(fileType: FileType): Promise<string[]>;
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
  getFullDescription(authority?: string): Promise<void>;
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
  lastExecutionStatus: ExecutionStatus | null;
}
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
  buildCreateFileActions(
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
  ): CommitAction[];

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
  buildTriggerAction(): Promise<CommitAction | null>;
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
   * Create a file at the given path, committing with the provided message (Overloaded IFile method).
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
   * Fetch the full text content of a file from the given path (Overloaded IFile method.)
   * @param filePath - the path (folder and filename) of the file to retrieve
   * @param optional flag indicating if the file is private (default is true)
   * @returns a promise resolving to the file’s content as a string
   */
  getFileContent(filePath: string, isPrivate?: boolean): Promise<string>;
}

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

// Snackbar interfaces
export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ShowNotificationPayload {
  message: string;
  severity: NotificationSeverity;
}

// indexedDBService interface
export interface IExecutionHistoryStorage {
  init(): Promise<void>;
  add(entry: DTExecutionResult): Promise<string>;
  update(entry: DTExecutionResult): Promise<void>;
  getById(id: string): Promise<DTExecutionResult | null>;
  getByDTName(dtName: string): Promise<DTExecutionResult[]>;
  getAll(): Promise<DTExecutionResult[]>;
  delete(id: string): Promise<void>;
  deleteByDTName(dtName: string): Promise<void>;
}
