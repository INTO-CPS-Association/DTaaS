import { getAuthority } from 'util/envUtil';
import {
  getGroupName,
  getDTDirectory,
  getBranchName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { ExecutionStatus, JobLog } from 'model/backend/interfaces/execution';
import {
  FileState,
  FileType,
  DigitalTwinInterface,
  DTAssetsInterface,
  LibraryAssetInterface,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import {
  BackendInterface,
  ProjectId,
} from 'model/backend/interfaces/backendInterfaces';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import DTAssets from 'model/backend/DTAssets';
import {
  executeDT,
  stopDT,
} from 'model/backend/util/digitalTwinPipelineExecution';
import {
  getExecutionHistoryFn,
  getExecutionHistoryByIdFn,
  updateExecutionLogsFn,
  updateExecutionStatusFn,
} from 'model/backend/util/digitalTwinExecutionHistory';
import {
  getAssetFilesFn,
  prepareAllAssetFilesFn,
  createDT,
} from 'model/backend/util/digitalTwinFileManagement';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase()); // replaceAll not supported

class DigitalTwin implements DigitalTwinInterface {
  public DTName: string;

  public description: string | undefined = '';

  public fullDescription: string = '';

  public backend: BackendInterface;

  public DTAssets: DTAssetsInterface;

  // Current active pipeline ID (for backward compatibility)
  public pipelineId: number | null = null;

  public activePipelineIds: number[] = [];

  // Current execution ID (for backward compatibility)
  public currentExecutionId: string | null = null;

  // Last execution status (for backward compatibility)
  public lastExecutionStatus!: ExecutionStatus | null;

  // Job logs for the current execution (for backward compatibility)
  public jobLogs: JobLog[] = [];

  // Loading state for the current pipeline (for backward compatibility)
  public pipelineLoading: boolean = false;

  // Completion state for the current pipeline (for backward compatibility)
  public pipelineCompleted: boolean = false;

  public descriptionFiles: string[] = [];

  public configFiles: string[] = [];

  public lifecycleFiles: string[] = [];

  public assetFiles: { assetPath: string; fileNames: string[] }[] = [];

  constructor(DTName: string, backend: BackendInterface) {
    this.DTName = DTName;
    this.backend = backend;
    this.DTAssets = new DTAssets(DTName, this.backend);

    // Set description and readme
    this.getDescription();
    this.getFullDescription();
  }

  async getDescription(): Promise<void> {
    try {
      const fileContent = await this.DTAssets.getFileContent('description.md');
      this.description = fileContent;
    } catch {
      this.description = `There is no description.md file`;
    }
  }

  async getFullDescription(): Promise<void> {
    const imagesPath = `${getDTDirectory()}/${this.DTName}`;
    try {
      const fileContent = await this.DTAssets.getFileContent('README.md');
      this.fullDescription = fileContent.replace(
        /(!\[[^\]]*\])\(([^)]+)\)/g, // replaceAll not supported
        (match: string, altText: string, imagePath: string) => {
          const fullUrl = `${getAuthority()}/${getGroupName()}/${sessionStorage.getItem('username')}/-/raw/${getBranchName()}/${imagesPath}/${imagePath}`;
          return `${altText}(${fullUrl})`;
        },
      );
    } catch {
      this.fullDescription = `There is no README.md file`;
    }
  }

  /**
   * Execute a Digital Twin and create an execution history entry
   * @returns Promise that resolves with the pipeline ID or null if execution failed
   */
  async execute(
    skipHistorySave: boolean = false,
    runnerTag?: string,
    branchName?: string,
  ): Promise<number | null> {
    return executeDT(this, skipHistorySave, runnerTag, branchName);
  }

  /**
   * Stop a specific pipeline execution
   * @param projectId The GitLab project ID
   * @param pipeline The pipeline to stop ('parentPipeline' or 'childPipeline')
   * @param executionId Optional execution ID to stop a specific execution
   * @returns Promise that resolves when the pipeline is stopped
   */
  async stop(
    projectId: ProjectId,
    pipeline: string,
    executionId?: string,
  ): Promise<void> {
    return stopDT(this, projectId, pipeline, executionId);
  }

  /**
   * Get all execution history entries for this Digital Twin
   * @returns Promise that resolves with an array of execution history entries
   */
  async getExecutionHistory(): Promise<DTExecutionResult[]> {
    return getExecutionHistoryFn(this);
  }

  /**
   * Get a specific execution history entry by ID
   * @param executionId The execution ID
   * @returns Promise that resolves with the execution history entry or undefined if not found
   */
  async getExecutionHistoryById(
    executionId: string,
  ): Promise<DTExecutionResult | undefined> {
    return getExecutionHistoryByIdFn(this, executionId);
  }

  /**
   * Update job logs for a specific execution
   * @param executionId The execution ID
   * @param jobLogs The job logs to update
   * @returns Promise that resolves when the logs are updated
   */
  async updateExecutionLogs(
    executionId: string,
    jobLogs: JobLog[],
  ): Promise<void> {
    return updateExecutionLogsFn(this, executionId, jobLogs);
  }

  /**
   * Update the status of a specific execution
   * @param executionId The execution ID
   * @param status The new status
   * @returns Promise that resolves when the status is updated
   */
  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
  ): Promise<void> {
    return updateExecutionStatusFn(this, executionId, status);
  }

  async create(
    files: FileState[],
    cartAssets: LibraryAssetInterface[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<string> {
    return createDT(this, files, cartAssets, libraryFiles);
  }

  async delete() {
    try {
      await this.DTAssets.delete();

      return `${this.DTName} deleted successfully`;
    } catch {
      return `Error deleting ${this.DTName} digital twin`;
    }
  }

  async getDescriptionFiles() {
    this.descriptionFiles = await this.DTAssets.getFileNames(
      FileType.DESCRIPTION,
    );
  }

  async getConfigFiles() {
    this.configFiles = await this.DTAssets.getFileNames(FileType.CONFIGURATION);
  }

  async getLifecycleFiles() {
    this.lifecycleFiles = await this.DTAssets.getFileNames(FileType.LIFECYCLE);
  }

  async prepareAllAssetFiles(
    cartAssets: LibraryAssetInterface[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<
    Array<{
      name: string;
      content: string;
      isNew: boolean;
      isFromCommonLibrary: boolean;
    }>
  > {
    return prepareAllAssetFilesFn(this, cartAssets, libraryFiles);
  }

  async getAssetFiles(): Promise<{ assetPath: string; fileNames: string[] }[]> {
    return getAssetFilesFn(this);
  }
}

export default DigitalTwin;
