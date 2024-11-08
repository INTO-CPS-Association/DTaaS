import { getAuthority } from 'util/envUtil';
import { FileState } from 'preview/store/file.slice';
import GitlabInstance from './gitlab';
import { isValidInstance, logError, logSuccess } from './digitalTwinUtils';
import DTAssets, { FileType } from './DTAssets';

const RUNNER_TAG = 'linux';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

class DigitalTwin {
  public DTName: string;

  public description: string | undefined = '';

  public fullDescription: string = '';

  public gitlabInstance: GitlabInstance;

  public DTAssets: DTAssets;

  public pipelineId: number | null = null;

  public lastExecutionStatus: string | null = null;

  public jobLogs: { jobName: string; log: string }[] = [];

  public pipelineLoading: boolean = false;

  public pipelineCompleted: boolean = false;

  public descriptionFiles: string[] = [];

  public configFiles: string[] = [];

  public lifecycleFiles: string[] = [];

  constructor(DTName: string, gitlabInstance: GitlabInstance) {
    this.DTName = DTName;
    this.gitlabInstance = gitlabInstance;
    this.DTAssets = new DTAssets(DTName, this.gitlabInstance);
  }

  async getDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      try {
        const fileContent =
          await this.DTAssets.getFileContent('description.md');
        this.description = fileContent;
      } catch (_error) {
        this.description = `There is no description.md file in the ${this.DTName} GitLab folder`;
      }
    }
  }

  async getFullDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      const imagesPath = `digital_twins/${this.DTName}/`;
      try {
        const fileContent = await this.DTAssets.getFileContent('README.md');
        this.fullDescription = fileContent.replace(
          /(!\[[^\]]*\])\(([^)]+)\)/g,
          (match, altText, imagePath) => {
            const fullUrl = `${getAuthority()}/dtaas/${sessionStorage.getItem('username')}/-/raw/main/${imagesPath}${imagePath}`;
            return `${altText}(${fullUrl})`;
          },
        );
      } catch (_error) {
        this.fullDescription = `There is no README.md file in the ${this.DTName} GitLab folder`;
      }
    } else {
      this.fullDescription = 'Error fetching description, retry.';
    }
  }

  private async triggerPipeline() {
    const variables = { DTName: this.DTName, RunnerTag: RUNNER_TAG };
    return this.gitlabInstance.api.PipelineTriggerTokens.trigger(
      this.gitlabInstance.projectId!,
      'main',
      this.gitlabInstance.triggerToken!,
      { variables },
    );
  }

  async execute(): Promise<number | null> {
    if (!isValidInstance(this)) {
      logError(this, RUNNER_TAG, 'Missing projectId or triggerToken');
      return null;
    }

    try {
      const response = await this.triggerPipeline();
      logSuccess(this, RUNNER_TAG);
      this.pipelineId = response.id;
      return this.pipelineId;
    } catch (error) {
      logError(this, RUNNER_TAG, String(error));
      return null;
    }
  }

  async stop(projectId: number, pipeline: string): Promise<void> {
    const pipelineId =
      pipeline === 'parentPipeline' ? this.pipelineId : this.pipelineId! + 1;
    try {
      await this.gitlabInstance.api.Pipelines.cancel(projectId, pipelineId!);
      this.gitlabInstance.logs.push({
        status: 'canceled',
        DTName: this.DTName,
        runnerTag: RUNNER_TAG,
      });
      this.lastExecutionStatus = 'canceled';
    } catch (error) {
      this.gitlabInstance.logs.push({
        status: 'error',
        error: new Error(String(error)),
        DTName: this.DTName,
        runnerTag: RUNNER_TAG,
      });
      this.lastExecutionStatus = 'error';
    }
  }

  async create(files: FileState[]): Promise<string> {
    if (!this.gitlabInstance.projectId) {
      return `Error creating ${this.DTName} digital twin: no project id`;
    }

    const mainFolderPath = `digital_twins/${this.DTName}`;
    const lifecycleFolderPath = `${mainFolderPath}/lifecycle`;

    try {
      await this.DTAssets.createFiles(
        files,
        mainFolderPath,
        lifecycleFolderPath,
      );
      await this.DTAssets.appendTriggerToPipeline();
      return `${this.DTName} digital twin files initialized successfully.`;
    } catch (error) {
      return `Error initializing ${this.DTName} digital twin files: ${String(error)}`;
    }
  }

  async delete() {
    if (this.gitlabInstance.projectId) {
      try {
        await this.DTAssets.delete();

        return `${this.DTName} deleted successfully`;
      } catch (_error) {
        return `Error deleting ${this.DTName} digital twin`;
      }
    }
    return `Error deleting ${this.DTName} digital twin: no project id`;
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
}

export default DigitalTwin;
