import { getBranchName } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import {
  FileType,
  FileState,
  FileHandlerInterface,
} from 'model/backend/interfaces/sharedInterfaces';
import {
  BackendInterface,
  RepositoryTreeItem,
} from 'model/backend/interfaces/backendInterfaces';

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

export function isImageFile(fileName: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
  return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
}

class FileHandler implements FileHandlerInterface {
  public name: string;

  public backend: BackendInterface;

  constructor(name: string, backend: BackendInterface) {
    this.name = name;
    this.backend = backend;
  }

  async createFile(
    file: FileState | { name: string; content: string; isNew: boolean },
    filePath: string,
    commitMessage: string,
    commonProject?: boolean,
  ): Promise<void> {
    const projectToUse = commonProject
      ? this.backend.getCommonProjectId()
      : this.backend.getProjectId();
    await this.backend.api.createRepositoryFile(
      projectToUse,
      `${filePath}/${file.name}`,
      getBranchName(),
      file.content,
      commitMessage,
    );
  }

  async updateFile(
    filePath: string,
    updatedContent: string,
    commitMessage: string,
  ): Promise<void> {
    await this.backend.api.editRepositoryFile(
      this.backend.getProjectId(),
      filePath,
      getBranchName(),
      updatedContent,
      commitMessage,
    );
  }

  async deleteDT(digitalTwinPath: string): Promise<void> {
    await this.backend.api.removeRepositoryFile(
      this.backend.getProjectId(),
      digitalTwinPath,
      getBranchName(),
      `Removing ${this.name} digital twin`,
    );
  }

  async getFileContent(filePath: string, isPrivate?: boolean): Promise<string> {
    const projectToUse =
      isPrivate === false
        ? this.backend.getCommonProjectId()
        : this.backend.getProjectId();
    const response = await this.backend.api.getRepositoryFileContent(
      projectToUse,
      filePath,
      getBranchName(),
    );
    return response.content;
  }

  async getFileNames(fileType: FileType): Promise<string[]> {
    const pathMap = {
      [FileType.DESCRIPTION]: `digital_twins/${this.name}`,
      [FileType.CONFIGURATION]: `digital_twins/${this.name}`,
      [FileType.LIFECYCLE]: `digital_twins/${this.name}/lifecycle`,
    };

    try {
      const response = await this.backend.api.listRepositoryFiles(
        this.backend.getProjectId(),
        pathMap[fileType],
        undefined,
        fileType === FileType.LIFECYCLE,
      );

      return response
        .filter((item: RepositoryTreeItem) => isValidFileType(item, fileType))
        .map((file: RepositoryTreeItem) => file.name);
    } catch {
      return [];
    }
  }

  async getLibraryFileNames(
    filePath: string,
    isPrivate: boolean,
  ): Promise<string[]> {
    const projectToUse = isPrivate
      ? this.backend.getProjectId()
      : this.backend.getCommonProjectId();

    try {
      const response = await this.backend.api.listRepositoryFiles(
        projectToUse,
        filePath,
        undefined,
        false,
      );

      const fileNames: string[] = [];

      const nestedFilesPromises = response.map(async (file) => {
        if (file.type === 'tree') {
          const nestedFiles = await this.getLibraryFileNames(
            `${filePath}/${file.name}`,
            isPrivate,
          );
          return nestedFiles.map((nestedFile) => `${file.name}/${nestedFile}`);
        }
        if (!isImageFile(file.name) && !file.name.endsWith('.fmu')) {
          return [file.name];
        }
        return [];
      });

      const allNestedFiles = await Promise.all(nestedFilesPromises);
      allNestedFiles.forEach((files) => fileNames.push(...files));

      return fileNames;
    } catch {
      return [];
    }
  }

  async getLibraryConfigFileNames(
    filePath: string,
    isPrivate: boolean,
  ): Promise<string[]> {
    const projectToUse = isPrivate
      ? this.backend.getProjectId()
      : this.backend.getCommonProjectId();

    const shouldBeRecursive = filePath.includes('common/');

    try {
      const response = await this.backend.api.listRepositoryFiles(
        projectToUse,
        filePath,
        undefined,
        shouldBeRecursive,
      );

      return response
        .filter((item: RepositoryTreeItem) =>
          isValidFileType(item, FileType.CONFIGURATION),
        )
        .map((file: RepositoryTreeItem) => file.name);
    } catch {
      return [];
    }
  }

  async getFolders(path: string): Promise<string[]> {
    try {
      const response = await this.backend.api.listRepositoryFiles(
        this.backend.getProjectId(),
        path,
        undefined,
        false,
      );

      return response
        .filter((item: { type: string }) => item.type === 'tree')
        .map((folder: { path: string }) => folder.path);
    } catch {
      return [];
    }
  }
}

export default FileHandler;
