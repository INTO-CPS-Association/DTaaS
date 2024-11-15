import { FileState } from 'preview/store/file.slice';
import GitlabInstance from './gitlab';
import { IFile } from './ifile';
import { FileType } from './DTAssets';

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
  public name: string;

  public gitlabInstance: GitlabInstance;

  constructor(name: string, gitlabInstance: GitlabInstance) {
    this.name = name;
    this.gitlabInstance = gitlabInstance;
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

  async updateFile(
    filePath: string,
    updatedContent: string,
    commitMessage: string,
  ): Promise<void> {
    await this.gitlabInstance.api.RepositoryFiles.edit(
      this.gitlabInstance.projectId!,
      filePath,
      'main',
      updatedContent,
      commitMessage,
    );
  }

  async deleteDT(digitalTwinPath: string): Promise<void> {
    await this.gitlabInstance.api.RepositoryFiles.remove(
      this.gitlabInstance.projectId!,
      digitalTwinPath,
      'main',
      `Removing ${this.name} digital twin`,
    );
  }

  async getFileContent(filePath: string): Promise<string> {
    const response = await this.gitlabInstance.api.RepositoryFiles.show(
      this.gitlabInstance.projectId!,
      filePath,
      'main',
    );
    return atob(response.content);
  }

  async getFileNames(fileType: FileType): Promise<string[]> {
    const pathMap = {
      [FileType.DESCRIPTION]: `digital_twins/${this.name}`,
      [FileType.CONFIGURATION]: `digital_twins/${this.name}`,
      [FileType.LIFECYCLE]: `digital_twins/${this.name}/lifecycle`,
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

  async getLibraryFileNames(filePath: string): Promise<string[]> {
    try {
      const response =
        await this.gitlabInstance.api.Repositories.allRepositoryTrees(
          this.gitlabInstance.projectId!,
          {
            path: filePath,
            recursive: false,
          },
        );

        return response
          .filter((item) => isValidFileType(item, FileType.CONFIGURATION))
          .map((file) => file.name);
      } catch {
        return [];
      }
    }
}

export default FileHandler;
