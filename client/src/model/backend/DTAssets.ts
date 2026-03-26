import {
  BackendInterface,
  CommitAction,
} from 'model/backend/interfaces/backendInterfaces';
import {
  DTAssetsInterface,
  FileHandlerInterface,
  FileState,
  FileType,
} from 'model/backend/interfaces/sharedInterfaces';
import FileHandler from 'model/backend/fileHandler';
import { getDTDirectory } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';

type CreateFileInput =
  | FileState
  | {
      name: string;
      content: string;
      isNew: boolean;
      isFromCommonLibrary: boolean;
    };

function filterNewFiles(
  files: CreateFileInput[] | FileState[],
): CreateFileInput[] {
  return (files as CreateFileInput[]).filter(
    (file): file is CreateFileInput => file.isNew,
  );
}

function resolveFilePath(
  file: CreateFileInput,
  mainFolderPath: string,
  lifecycleFolderPath: string,
): string {
  const fileType = (file as FileState).type;
  const mainPath = file.isFromCommonLibrary
    ? `${mainFolderPath}/common`
    : mainFolderPath;
  const lifecyclePath = file.isFromCommonLibrary
    ? `${mainPath}/lifecycle`
    : lifecycleFolderPath;
  return fileType === FileType.LIFECYCLE ? lifecyclePath : mainPath;
}

export function getFilePath(
  file: FileState,
  mainFolderPath: string,
  lifecycleFolderPath: string,
): string {
  return file.type === FileType.LIFECYCLE
    ? lifecycleFolderPath
    : mainFolderPath;
}

class DTAssets implements DTAssetsInterface {
  public DTName: string;

  public backend: BackendInterface;

  public fileHandler: FileHandlerInterface;

  constructor(DTName: string, backend: BackendInterface) {
    this.DTName = DTName;
    this.backend = backend;
    this.fileHandler = new FileHandler(DTName, backend);
  }

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
  ): CommitAction[] {
    return filterNewFiles(files).map((file) => ({
      action: 'create' as const,
      filePath: `${resolveFilePath(file, mainFolderPath, lifecycleFolderPath)}/${file.name}`,
      content: file.content,
    }));
  }

  private buildTriggerContent(): string {
    return `\ntrigger_${this.DTName}:\n  stage: triggers\n  trigger:\n    include: ${getDTDirectory()}/${this.DTName}/.gitlab-ci.yml\n  rules:\n    - if: '$DTName == "${this.DTName}"'\n      when: always\n  variables:\n    RunnerTag: $RunnerTag\n`;
  }

  async buildTriggerAction(): Promise<CommitAction | null> {
    const filePath = `.gitlab-ci.yml`;
    const fileContent = await this.fileHandler.getFileContent(filePath);

    if (fileContent.includes(`trigger_${this.DTName}`)) {
      return null;
    }

    return {
      action: 'update' as const,
      filePath,
      content: `${fileContent.trimEnd()}\n${this.buildTriggerContent()}`,
    };
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
    await Promise.all(
      filterNewFiles(files).map(async (file) => {
        const filePath = resolveFilePath(
          file,
          mainFolderPath,
          lifecycleFolderPath,
        );
        const fileType = (file as FileState).type;
        const commitMessage = `Add ${file.name} to ${fileType} folder`;
        await this.fileHandler.createFile(file, filePath, commitMessage);
      }),
    );
  }

  async getFilesFromAsset(assetPath: string, isPrivate: boolean) {
    try {
      const fileNames = await this.fileHandler.getLibraryFileNames(
        assetPath,
        isPrivate,
      );

      const filePromises = fileNames.map(async (fileName) => {
        const fileContent = await this.fileHandler.getFileContent(
          `${assetPath}/${fileName}`,
          isPrivate,
        );

        return {
          name: fileName,
          content: fileContent,
          path: assetPath,
          isPrivate,
        };
      });

      const files = await Promise.all(filePromises);
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
      ? `${getDTDirectory()}/${this.DTName}/${fileName}`
      : `${getDTDirectory()}/${this.DTName}/lifecycle/${fileName}`;

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

      if (fileContent.includes(`trigger_${this.DTName}`)) {
        return `Trigger already exists in the pipeline for ${this.DTName}`;
      }

      const updatedContent = `${fileContent.trimEnd()}\n${this.buildTriggerContent()}`;
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

      if (updatedContent === fileContent) {
        return `No trigger found for ${this.DTName} in ${filePath}`;
      }

      const commitMessage = `Remove trigger for ${this.DTName} from .gitlab-ci.yml`;
      await this.fileHandler.updateFile(
        filePath,
        updatedContent,
        commitMessage,
      );
      return `Trigger removed from pipeline for ${this.DTName}`;
    } catch (error) {
      return `Error removing trigger from pipeline: ${error}`;
    }
  }

  async delete(): Promise<void> {
    await this.removeTriggerFromPipeline();
    await this.fileHandler.deleteDT(`${getDTDirectory()}/${this.DTName}`);

    const libraryDTs = await this.fileHandler.getFolders(
      `common/${getDTDirectory()}`,
    );
    if (libraryDTs.includes(`common/${getDTDirectory()}/${this.DTName}`)) {
      await this.fileHandler.deleteDT(
        `common/${getDTDirectory()}/${this.DTName}`,
      );
    }
  }

  async getFileContent(fileName: string): Promise<string> {
    const isFileWithoutExtension = !fileName.includes('.');

    const filePath = isFileWithoutExtension
      ? `${getDTDirectory()}/${this.DTName}/lifecycle/${fileName}`
      : `${getDTDirectory()}/${this.DTName}/${fileName}`;

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
