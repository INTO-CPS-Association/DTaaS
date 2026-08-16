import { AssetTypes } from 'model/backend/gitlab/digitalTwinConfig/constants';
import {
  getBranchName,
  getGroupName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { Asset } from 'model/backend/Asset';
import {
  BackendInterface,
  ProjectId,
  RepositoryTreeItem,
} from 'model/backend/interfaces/backendInterfaces';
import { LibraryAssetInterface } from 'model/backend/interfaces/sharedInterfaces';
import LibraryManager from 'model/backend/libraryManager';

class LibraryAsset implements LibraryAssetInterface {
  public name: string;

  public path: string;

  public type: string;

  public isPrivate: boolean;

  public backend: BackendInterface;

  public description: string = '';

  public fullDescription: string = '';

  public libraryManager: LibraryManager;

  public configFiles: string[] = [];

  constructor(
    libraryManager: LibraryManager,
    path: string,
    isPrivate: boolean,
    type: string,
  ) {
    this.path = path;
    this.isPrivate = isPrivate;
    this.type = type;
    this.libraryManager = libraryManager;
    this.name = libraryManager.assetName;
    this.backend = libraryManager.backend;
  }

  async getDescription(): Promise<void> {
    if (this.backend?.getProjectId()) {
      try {
        const fileContent = await this.libraryManager.getFileContent(
          this.isPrivate,
          this.path,
          'description.md',
        );
        this.description = fileContent;
      } catch {
        this.description = `There is no description.md file`;
      }
    }
  }

  async getFullDescription(authority: string): Promise<void> {
    if (this.backend?.getProjectId()) {
      const imagesPath = this.path;
      try {
        const fileContent = await this.libraryManager.getFileContent(
          this.isPrivate,
          this.path,
          'README.md',
        );
        this.fullDescription = fileContent.replace(
          /(!\[[^\]]*\])\(([^)]+)\)/g, // replaceAll not supported
          (match: string, altText: string, imagePath: string) => {
            const fullUrl = `${authority}/${getGroupName()}/${sessionStorage.getItem('username')}/-/raw/${getBranchName()}/${imagesPath}/${imagePath}`;
            return `${altText}(${fullUrl})`;
          },
        );
      } catch {
        this.fullDescription = `There is no README.md file`;
      }
    } else {
      this.fullDescription = 'Error fetching description, retry.';
    }
  }

  async getConfigFiles() {
    this.configFiles = await this.libraryManager.getFileNames(
      this.isPrivate,
      this.path,
    );
  }
}

export async function getLibrarySubfolders(
  projectId: ProjectId,
  type: keyof typeof AssetTypes,
  backend: BackendInterface,
): Promise<Asset[]> {
  const mappedPath = AssetTypes[type];
  if (!mappedPath) {
    throw new Error(`Invalid asset type: ${type}`);
  }

  const isPrivate = projectId === backend.getProjectId();

  const { api } = backend;
  const files = await api.listRepositoryFiles(projectId, mappedPath);

  const subfolders: Asset[] = await Promise.all(
    files
      .filter(
        (file: RepositoryTreeItem) =>
          file.type === 'tree' && file.path !== mappedPath,
      )
      .map(async (file: RepositoryTreeItem) => ({
        name: file.name,
        path: file.path,
        type,
        isPrivate,
      })),
  );
  return subfolders;
}

export default LibraryAsset;
