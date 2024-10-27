/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { getAuthority } from 'util/envUtil';
import { FileState } from 'preview/store/file.slice';
import GitlabInstance from './gitlab';
import { createFile, getCommitMessage, getFilePath, isValidInstance, logError, logSuccess } from './digitalTwinUtils';

const RUNNER_TAG = 'linux';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

class DigitalTwin {
  public DTName: string;

  public description: string | undefined = '';

  public fullDescription: string = '';

  public gitlabInstance: GitlabInstance;

  public pipelineId: number | null = null;

  public lastExecutionStatus: string | null = null;

  public jobLogs: { jobName: string; log: string }[] = [];

  public pipelineLoading: boolean = false;

  public pipelineCompleted: boolean = false;

  public descriptionFiles: string[] = [];

  public lifecycleFiles: string[] = [];

  public configFiles: string[] = [];

  constructor(DTName: string, gitlabInstance: GitlabInstance) {
    this.DTName = DTName;
    this.gitlabInstance = gitlabInstance;
  }

  async getDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      const descriptionPath = `digital_twins/${this.DTName}/description.md`;
      try {
        const fileData = await this.gitlabInstance.api.RepositoryFiles.show(
          this.gitlabInstance.projectId,
          descriptionPath,
          'main',
        );
        this.description = atob(fileData.content);
      } catch (_error) {
        this.description = `There is no description.md file in the ${this.DTName} GitLab folder`;
      }
    }
  }

  async getFullDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      const readmePath = `digital_twins/${this.DTName}/README.md`;
      const imagesPath = `digital_twins/${this.DTName}/`;
      try {
        const fileData = await this.gitlabInstance.api.RepositoryFiles.show(
          this.gitlabInstance.projectId,
          readmePath,
          'main',
        );
        this.fullDescription = atob(fileData.content).replace(
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

  async triggerPipeline() {
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

  async delete() {
    if (this.gitlabInstance.projectId) {
      const digitalTwinPath = `digital_twins/${this.DTName}`;
      try {
        await this.gitlabInstance.api.RepositoryFiles.remove(
          this.gitlabInstance.projectId,
          digitalTwinPath,
          'main',
          `Removing ${this.DTName} digital twin`,
        );
        return `${this.DTName} deleted successfully`;
      } catch (_error) {
        return `Error deleting ${this.DTName} digital twin`;
      }
    }
    return `Error deleting ${this.DTName} digital twin: no project id`;
  }

  async getDescriptionFiles() {
    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: `digital_twins/${this.DTName}`,
            recursive: true,
          },
        );

      const filteredFiles = response
        .filter(
          (item: { type: string; name: string; path: string }) =>
            item.type === 'blob' && item.name.endsWith('.md'),
        )
        .map((file: { name: string }) => file.name);

      this.descriptionFiles = filteredFiles;
    } catch (_error) {
      this.descriptionFiles = [];
    }
  }

  async getLifecycleFiles() {
    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: `digital_twins/${this.DTName}`,
            recursive: true,
          },
        );

      const filteredFiles = response
        .filter(
          (item: { type: string; name: string; path: string }) =>
            item.type === 'blob' && item.path.includes('/lifecycle/'),
        )
        .map((file: { name: string }) => file.name);

      this.lifecycleFiles = filteredFiles;
    } catch (_error) {
      this.lifecycleFiles = [];
    }
  }

  async getConfigFiles() {
    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: `digital_twins/${this.DTName}`,
            recursive: false,
          },
        );

      const filteredFiles = response
        .filter(
          (item: { type: string; name: string }) =>
            item.type === 'blob' &&
            (item.name.endsWith('.json') || item.name.endsWith('.yml')),
        )
        .map((file: { name: string }) => file.name);

      this.configFiles = filteredFiles;
    } catch (_error) {
      this.configFiles = [];
    }
  }

  async getFileContent(fileName: string) {
    const isFileWithoutExtension = !fileName.includes('.');

    const filePath = isFileWithoutExtension
      ? `digital_twins/${this.DTName}/lifecycle/${fileName}`
      : `digital_twins/${this.DTName}/${fileName}`;

    const response = await this.gitlabInstance.api.RepositoryFiles.show(
      this.gitlabInstance.projectId!,
      filePath,
      'main',
    );
    const fileContent = atob(response.content);
    return fileContent;
  }

  async updateFileContent(fileName: string, fileContent: string) {
    const hasExtension = fileName.includes('.');

    const filePath = hasExtension
      ? `digital_twins/${this.DTName}/${fileName}`
      : `digital_twins/${this.DTName}/lifecycle/${fileName}`;

    const commitMessage = `Update ${fileName} content`;

    await this.gitlabInstance.api.RepositoryFiles.edit(
      this.gitlabInstance.projectId!,
      filePath,
      'main',
      fileContent,
      commitMessage,
    );
  }

  async createDT(files: FileState[]): Promise<string> {
    if (!this.gitlabInstance.projectId) {
      return `Error creating ${this.DTName} digital twin: no project id`;
    }
  
    const mainFolderPath = `digital_twins/${this.DTName}`;
    const lifecycleFolderPath = `${mainFolderPath}/lifecycle`;
  
    try {
      for (const file of files) {
        if (file.isNew) {
          const filePath = getFilePath(file, mainFolderPath, lifecycleFolderPath);
          const commitMessage = getCommitMessage(file);
  
          await createFile(this.gitlabInstance, this.gitlabInstance.projectId, file, filePath, commitMessage);
        }
      }
  
      return `${this.DTName} digital twin created successfully.`;
    } catch (error) {
      return `Error creating ${this.DTName} digital twin: ${String(error)}`;
    }
  }
}

export default DigitalTwin;
