/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { getAuthority } from 'util/envUtil';
import { FileState } from 'preview/store/file.slice';
import { LibraryConfigFile } from 'preview/store/libraryConfigFiles.slice';
import { RUNNER_TAG } from 'model/backend/gitlab/constants';
import { BackendInterface } from 'model/backend/gitlab/interfaces';
import {
  isValidInstance,
  logError,
  logSuccess,
  getUpdatedLibraryFile,
} from './digitalTwinUtils';
import DTAssets, { FileType } from './DTAssets';
import LibraryAsset from './libraryAsset';

export const formatName = (name: string) =>
  name.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());

class DigitalTwin {
  public DTName: string;

  public description: string | undefined = '';

  public fullDescription: string = '';

  public gitlabInstance: BackendInterface;

  public DTAssets: DTAssets;

  public pipelineId: number | null = null;

  public lastExecutionStatus: string | null = null;

  public jobLogs: { jobName: string; log: string }[] = [];

  public pipelineLoading: boolean = false;

  public pipelineCompleted: boolean = false;

  public descriptionFiles: string[] = [];

  public configFiles: string[] = [];

  public lifecycleFiles: string[] = [];

  public assetFiles: { assetPath: string; fileNames: string[] }[] = [];

  constructor(DTName: string, gitlabInstance: BackendInterface) {
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
        this.description = `There is no description.md file`;
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
        this.fullDescription = `There is no README.md file`;
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

  async create(
    files: FileState[],
    cartAssets: LibraryAsset[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<string> {
    if (!this.gitlabInstance.projectId) {
      return `Error creating ${this.DTName} digital twin: no project id`;
    }

    const mainFolderPath = `digital_twins/${this.DTName}`;
    const lifecycleFolderPath = `${mainFolderPath}/lifecycle`;

    try {
      const assetFilesToCreate = await this.prepareAllAssetFiles(
        cartAssets,
        libraryFiles,
      );

      await this.DTAssets.createFiles(
        files,
        mainFolderPath,
        lifecycleFolderPath,
      );

      await this.DTAssets.createFiles(
        assetFilesToCreate,
        mainFolderPath,
        lifecycleFolderPath,
      );

      await this.DTAssets.appendTriggerToPipeline();

      return `${this.DTName} digital twin files initialized successfully.`;
    } catch (error) {
      return `Error initializing ${this.DTName} digital twin files: ${String(
        error,
      )}`;
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

  async prepareAllAssetFiles(
    cartAssets: LibraryAsset[],
    libraryFiles: LibraryConfigFile[],
  ): Promise<
    Array<{
      name: string;
      content: string;
      isNew: boolean;
      isFromCommonLibrary: boolean;
    }>
  > {
    const assetFilesToCreate: Array<{
      name: string;
      content: string;
      isNew: boolean;
      isFromCommonLibrary: boolean;
    }> = [];

    for (const asset of cartAssets) {
      const assetFiles = await this.DTAssets.getFilesFromAsset(
        asset.path,
        asset.isPrivate,
      );
      for (const assetFile of assetFiles) {
        const updatedFile = getUpdatedLibraryFile(
          assetFile.name,
          asset.path,
          asset.isPrivate,
          libraryFiles,
        );

        assetFilesToCreate.push({
          name: `${asset.name}/${assetFile.name}`,
          content: updatedFile ? updatedFile.fileContent : assetFile.content,
          isNew: true,
          isFromCommonLibrary: !asset.isPrivate,
        });
      }
    }
    return assetFilesToCreate;
  }

  async getAssetFiles(): Promise<{ assetPath: string; fileNames: string[] }[]> {
    const mainFolderPath = `digital_twins/${this.DTName}`;
    const excludeFolder = 'lifecycle';
    const result: { assetPath: string; fileNames: string[] }[] = [];

    try {
      const folders = await this.DTAssets.getFolders(mainFolderPath);

      const validFolders = folders.filter(
        (folder) => !folder.includes(excludeFolder),
      );

      for (const folder of validFolders) {
        if (folder.endsWith('/common')) {
          const subFolders = await this.DTAssets.getFolders(folder);
          for (const subFolder of subFolders) {
            const fileNames =
              await this.DTAssets.getLibraryConfigFileNames(subFolder);

            result.push({
              assetPath: subFolder,
              fileNames,
            });
          }
        } else {
          const fileNames =
            await this.DTAssets.getLibraryConfigFileNames(folder);

          result.push({
            assetPath: folder,
            fileNames,
          });
        }
      }

      this.assetFiles = result;
    } catch (_error) {
      return [];
    }
    return result;
  }
}

export default DigitalTwin;
