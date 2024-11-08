/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { FileState } from 'preview/store/file.slice';
import GitlabInstance from './gitlab';
import FileHandler from './fileHandler';

export enum FileType {
  DESCRIPTION = 'description',
  CONFIGURATION = 'configuration',
  LIFECYCLE = 'lifecycle',
}

export function getFilePath(
  file: FileState,
  mainFolderPath: string,
  lifecycleFolderPath: string,
): string {
  return file.type === 'lifecycle' ? lifecycleFolderPath : mainFolderPath;
}

class DTAssets {
  public DTName: string;

  public gitlabInstance: GitlabInstance;

  public fileHandler: FileHandler;

  constructor(DTName: string, gitlabInstance: GitlabInstance) {
    this.DTName = DTName;
    this.gitlabInstance = gitlabInstance;
    this.fileHandler = new FileHandler(DTName, gitlabInstance);
  }

  async createFiles(
    files: FileState[],
    mainFolderPath: string,
    lifecycleFolderPath: string,
  ): Promise<void> {
    for (const file of files) {
      if (file.isNew) {
        const filePath = getFilePath(file, mainFolderPath, lifecycleFolderPath);
        const commitMessage = `Add ${file.name} to ${file.type === 'lifecycle' ? 'lifecycle' : 'digital twin'} folder`;
        await this.fileHandler.createFile(file, filePath, commitMessage);
      }
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

      const updatedContent = `${fileContent.trimEnd()  }\n${  triggerContent}`;

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
  }

  async getFileContent(fileName: string): Promise<string> {
    const isFileWithoutExtension = !fileName.includes('.');

    const filePath = isFileWithoutExtension
      ? `digital_twins/${this.DTName}/lifecycle/${fileName}`
      : `digital_twins/${this.DTName}/${fileName}`;

    const fileContent = await this.fileHandler.getFileContent(filePath);

    return fileContent;
  }

  async getFileNames(fileType: FileType): Promise<string[]> {
    return this.fileHandler.getFileNames(fileType);
  }
}

export default DTAssets;
