import { getAuthority } from "util/envUtil";
import DTAssets from "./DTAssets";
import GitlabInstance from "./gitlab";

class LibraryAsset {
  public name: string;

  public path: string;

  public type: string;

  public isPrivate: boolean;
  
  public gitlabInstance: GitlabInstance;

  public description: string = '';

  public fullDescription: string = '';

  public DTAssets: DTAssets

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
    this.DTAssets = new DTAssets(name, this.gitlabInstance);
  }

  async getDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      try {
        const fileContent =
          await this.DTAssets.getFileContent('description.md');
        this.description = fileContent;
      } catch (_error) {
        this.description = `There is no description.md file in the ${this.name} GitLab folder`;
      }
    }
  }

  async getFullDescription(): Promise<void> {
    if (this.gitlabInstance.projectId) {
      const imagesPath = this.path;
      console.log('LibraryAsset.ts: imagesPath:', imagesPath);
      try {
        const fileContent = await this.DTAssets.getFileContent('README.md');
        this.fullDescription = fileContent.replace(
          /(!\[[^\]]*\])\(([^)]+)\)/g,
          (match, altText, imagePath) => {
            const fullUrl = `${getAuthority()}/dtaas/${sessionStorage.getItem('username')}/-/raw/main/${imagesPath}/${imagePath}`;
            return `${altText}(${fullUrl})`;
          },
        );
      } catch (_error) {
        this.fullDescription = `There is no README.md file in the ${this.name} GitLab folder`;
      }
    } else {
      this.fullDescription = 'Error fetching description, retry.';
    }
  }
}

export default LibraryAsset;
