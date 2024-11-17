import { getAuthority } from 'util/envUtil';
import GitlabInstance from './gitlab';
import LibraryManager from './libraryManager';

class LibraryAsset {
  public name: string;

  public path: string;

  public type: string;

  public isPrivate: boolean;

  public gitlabInstance: GitlabInstance;

  public description: string = '';

  public fullDescription: string = '';

  public libraryManager: LibraryManager;

  public configFiles: string[] = [];

  constructor(
    name: string,
    path: string,
    isPrivate: boolean,
    type: string,
    gitlabInstance: GitlabInstance,
  ) {
    this.name = name;
    this.path = path;
    this.isPrivate = isPrivate;
    this.type = type;
    this.gitlabInstance = gitlabInstance;
    this.libraryManager = new LibraryManager(name, this.gitlabInstance);
  }

  async getDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      try {
        const fileContent = await this.libraryManager.getFileContent(
          this.isPrivate,
          this.path,
          'description.md',
        );
        this.description = fileContent;
      } catch (_error) {
        this.description = `There is no description.md file`;
      }
    }
  }

  async getFullDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      const imagesPath = this.path;
      try {
        const fileContent = await this.libraryManager.getFileContent(
          this.isPrivate,
          this.path,
          'README.md',
        );
        this.fullDescription = fileContent.replace(
          /(!\[[^\]]*\])\(([^)]+)\)/g,
          (match, altText, imagePath) => {
            const fullUrl = `${getAuthority()}/dtaas/${sessionStorage.getItem('username')}/-/raw/main/${imagesPath}/${imagePath}`;
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

  async getConfigFiles() {
    this.configFiles = await this.libraryManager.getFileNames(
      this.isPrivate,
      this.path,
    );
  }
}

export default LibraryAsset;
