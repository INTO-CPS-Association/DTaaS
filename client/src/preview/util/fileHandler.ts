/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */

import { FileState } from 'preview/store/file.slice';
import GitlabInstance from './gitlab';
import { IFile } from './ifile';

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

export function isValidFileType(
  item: { type: string; name: string; path: string },
  fileType: FileType,
): boolean {
  const typeChecks = {
    [FileType.DESCRIPTION]: item.type === 'blob' && item.name.endsWith('.md'),
    [FileType.CONFIGURATION]:
      item.type === 'blob' && /\.(json|yml|yaml)$/.test(item.name),
    [FileType.LIFECYCLE]:
      item.type === 'blob' && item.path.includes('/lifecycle/'),
  };

  return typeChecks[fileType];
}

class FileHandler implements IFile {
  public DTName: string;

  public gitlabInstance: GitlabInstance;

  constructor(DTName: string, gitlabInstance: GitlabInstance) {
    this.DTName = DTName;
    this.gitlabInstance = gitlabInstance;
  }

  async getFileContent(fileName: string): Promise<string> {
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

  async updateFileContent(
    fileName: string,
    fileContent: string,
  ): Promise<void> {
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

  async createFile(
    file: FileState,
    filePath: string,
    commitMessage: string,
  ): Promise<void> {
    await this.gitlabInstance.api.RepositoryFiles.create(
      this.gitlabInstance.projectId!,
      `${filePath}/${file.name}`,
      'main',
      file.content,
      commitMessage,
    );
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
        await this.createFile(file, filePath, commitMessage);
      }
    }
  }

  async getFileNames(fileType: FileType): Promise<string[]> {
    const pathMap = {
      [FileType.DESCRIPTION]: `digital_twins/${this.DTName}`,
      [FileType.CONFIGURATION]: `digital_twins/${this.DTName}`,
      [FileType.LIFECYCLE]: `digital_twins/${this.DTName}/lifecycle`,
    };

    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: pathMap[fileType],
            recursive: fileType === FileType.LIFECYCLE,
          },
        );

      return response
        .filter((item) => isValidFileType(item, fileType))
        .map((file) => file.name);
    } catch {
      return [];
    }
  }

  async appendTriggerToPipeline(): Promise<string> {
    const filePath = `.gitlab-ci.yml`;
    const branch = 'main';

    try {
      const response = await this.gitlabInstance.api.RepositoryFiles.show(
        this.gitlabInstance.projectId!,
        filePath,
        branch,
      );
      const fileContent = atob(response.content);

      const triggerContent = `
      trigger_${this.DTName}:
        stage: triggers
        trigger:
          include: digital_twins/${this.DTName}/.gitlab-ci.yml
        rules: 
          - if: '$DTName == "${this.DTName}"'
            when: always
        variables:
          RunnerTag: $RunnerTag
      `;

      const updatedContent = fileContent + triggerContent;

      const commitMessage = `Add trigger for ${this.DTName} to .gitlab-ci.yml`;
      await this.gitlabInstance.api.RepositoryFiles.edit(
        this.gitlabInstance.projectId!,
        filePath,
        branch,
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
    const branch = 'main';

    try {
      const response = await this.gitlabInstance.api.RepositoryFiles.show(
        this.gitlabInstance.projectId!,
        filePath,
        branch,
      );
      const fileContent = atob(response.content);

      const triggerPattern = new RegExp(
        `\\n?\\s*trigger_${this.DTName}:.*?(?=\\n\\s*trigger_|$)`,
        'gs',
      );

      const updatedContent = fileContent.replace(triggerPattern, '');

      if (updatedContent !== fileContent) {
        const commitMessage = `Remove trigger for ${this.DTName} from .gitlab-ci.yml`;
        await this.gitlabInstance.api.RepositoryFiles.edit(
          this.gitlabInstance.projectId!,
          filePath,
          branch,
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
}

export default FileHandler;
