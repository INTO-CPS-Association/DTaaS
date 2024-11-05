/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import { FileState } from 'preview/store/file.slice';
import GitlabInstance from './gitlab';
import { IFile } from './ifile';

export function getFilePath(
  file: FileState,
  mainFolderPath: string,
  lifecycleFolderPath: string,
): string {
  return file.type === 'lifecycle' ? lifecycleFolderPath : mainFolderPath;
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

  async getDescriptionFiles(): Promise<string[]> {
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

      return filteredFiles as string[];
    } catch (error) {
      return [];
    }
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

  async getConfigFiles(): Promise<string[]> {
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

      return filteredFiles;
    } catch (error) {
      return [];
    }
  }

  async getLifecycleFiles(): Promise<string[]> {
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

      return filteredFiles;
    } catch (error) {
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
