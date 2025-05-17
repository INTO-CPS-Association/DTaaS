/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import {
  FileState,
  BackendInterface,
  DTAssetsInterface,
  FileHandlerInterface,
} from 'model/backend/gitlab/interfaces';
import { FileType } from 'model/backend/gitlab/constants';
import FileHandler from './fileHandler';

export function getFilePath(
  file: FileState,
  mainFolderPath: string,
  lifecycleFolderPath: string,
): string {
  return file.type === 'lifecycle' ? lifecycleFolderPath : mainFolderPath;
}

class DTAssets implements DTAssetsInterface {
  public DTName: string;

  public backend: BackendInterface;

  public fileHandler: FileHandlerInterface;

  constructor(DTName: string, gitlabInstance: BackendInterface) {
    this.DTName = DTName;
    this.backend = gitlabInstance;
    this.fileHandler = new FileHandler(DTName, gitlabInstance);
  }

  async createFiles(
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
  ): Promise<void> {
    for (const file of files) {
      const fileType = (file as FileState).type || 'asset';

      if (file.isNew) {
        const mainFolderPathUpdated = file.isFromCommonLibrary
          ? `${mainFolderPath}/common`
          : mainFolderPath;
        const lifecycleFolderPathUpdated = file.isFromCommonLibrary
          ? `${mainFolderPathUpdated}/lifecycle`
          : lifecycleFolderPath;
        const filePath =
          fileType === 'lifecycle'
            ? lifecycleFolderPathUpdated
            : mainFolderPathUpdated;
        const commitMessage = `Add ${file.name} to ${fileType} folder`;
        await this.fileHandler.createFile(file, filePath, commitMessage);
      }
    }
  }

  async getFilesFromAsset(assetPath: string, isPrivate: boolean) {
    try {
      const fileNames = await this.fileHandler.getLibraryFileNames(
        assetPath,
        isPrivate,
      );

      const files: Array<{
        name: string;
        content: string;
        path: string;
        isPrivate: boolean;
      }> = [];

      for (const fileName of fileNames) {
        const fileContent = await this.fileHandler.getFileContent(
          `${assetPath}/${fileName}`,
          isPrivate,
        );

        files.push({
          name: fileName,
          content: fileContent,
          path: assetPath,
          isPrivate,
        });
      }

      return files;
    } catch (error) {
      throw new Error(
        `Error fetching files from asset at ${assetPath}: ${error}`,
      );
    }
  }

  async updateFileContent(
    fileName: string,
    fileContent: string,
  ): Promise<void> {
    const hasExtension = fileName.includes('.');

    const filePath = hasExtension
      ? `digital_twins/${this.DTName}/${fileName}`
      : `digital_twins/${this.DTName}/lifecycle/${fileName}`;

    const commitMessage = `Update ${fileName} content`;

    await this.fileHandler.updateFile(filePath, fileContent, commitMessage);
  }

  async updateLibraryFileContent(
    fileName: string,
    fileContent: string,
    assetPath: string,
  ): Promise<void> {
    const filePath = `${assetPath}/${fileName}`;
    const commitMessage = `Update ${fileName} content`;

    await this.fileHandler.updateFile(filePath, fileContent, commitMessage);
  }

  async appendTriggerToPipeline(): Promise<string> {
    const filePath = `.gitlab-ci.yml`;

    try {
      const fileContent = await this.fileHandler.getFileContent(filePath);

      const triggerKey = `trigger_${this.DTName}`;
      if (fileContent.includes(triggerKey)) {
        return `Trigger already exists in the pipeline for ${this.DTName}`;
      }

      const triggerContent = `
${triggerKey}:
  stage: triggers
  trigger:
    include: digital_twins/${this.DTName}/.gitlab-ci.yml
  rules:
    - if: '$DTName == "${this.DTName}"'
      when: always
  variables:
    RunnerTag: $RunnerTag
`;

      const updatedContent = `${fileContent.trimEnd()}\n${triggerContent}`;

      const commitMessage = `Add trigger for ${this.DTName} to .gitlab-ci.yml`;
      await this.fileHandler.updateFile(
        filePath,
        updatedContent,
        commitMessage,
      );

      return `Trigger appended to pipeline for ${this.DTName}`;
    } catch (error) {
      return `Error appending trigger to pipeline: ${error}`;
    }
  }

  async removeTriggerFromPipeline(): Promise<string> {
    const filePath = `.gitlab-ci.yml`;

    try {
      const fileContent = await this.fileHandler.getFileContent(filePath);

      const triggerPattern = new RegExp(
        `\\n?\\s*trigger_${this.DTName}:.*?(?=\\n\\s*trigger_|$)`,
        'gs',
      );

      const updatedContent = fileContent.replace(triggerPattern, '');

      if (updatedContent !== fileContent) {
        const commitMessage = `Remove trigger for ${this.DTName} from .gitlab-ci.yml`;
        await this.fileHandler.updateFile(
          filePath,
          updatedContent,
          commitMessage,
        );
      } else {
        return `No trigger found for ${this.DTName} in ${filePath}`;
      }
      return `Trigger removed from pipeline for ${this.DTName}`;
    } catch (error) {
      return `Error removing trigger from pipeline: ${error}`;
    }
  }

  async delete(): Promise<void> {
    await this.removeTriggerFromPipeline();
    await this.fileHandler.deleteDT(`digital_twins/${this.DTName}`);

    const libraryDTs =
      await this.fileHandler.getFolders(`common/digital_twins`);
    if (libraryDTs.includes(`common/digital_twins/${this.DTName}`)) {
      await this.fileHandler.deleteDT(`common/digital_twins/${this.DTName}`);
    }
  }

  async getFileContent(fileName: string): Promise<string> {
    const isFileWithoutExtension = !fileName.includes('.');

    const filePath = isFileWithoutExtension
      ? `digital_twins/${this.DTName}/lifecycle/${fileName}`
      : `digital_twins/${this.DTName}/${fileName}`;

    const fileContent = await this.fileHandler.getFileContent(filePath);

    return fileContent;
  }

  async getLibraryFileContent(
    assetPath: string,
    fileName: string,
  ): Promise<string> {
    const filePath = `${assetPath}/${fileName}`;
    return this.fileHandler.getFileContent(filePath);
  }

  async getFileNames(fileType: FileType): Promise<string[]> {
    return this.fileHandler.getFileNames(fileType);
  }

  async getLibraryConfigFileNames(filePath: string): Promise<string[]> {
    return this.fileHandler.getLibraryConfigFileNames(filePath, true);
  }

  async getFolders(path: string): Promise<string[]> {
    return this.fileHandler.getFolders(path);
  }
}

export default DTAssets;
