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

class LibraryManager {
  public assetName: string;

  public gitlabInstance: GitlabInstance;

  public fileHandler: FileHandler;

  constructor(assetName: string, gitlabInstance: GitlabInstance) {
    this.assetName = assetName;
    this.gitlabInstance = gitlabInstance;
    this.fileHandler = new FileHandler(assetName, gitlabInstance);
  }

  async getFileContent(isPrivate: boolean, path: string, fileName: string): Promise<string> {
    const filePath = isPrivate? `${path}/${fileName}` : `common/${path}/${fileName}`;

    console.log(filePath)
    const fileContent = await this.fileHandler.getFileContent(filePath);
    console.log('fileContent', fileContent);
    return fileContent;
  }

  async getFileNames(isPrivate: boolean, path: string): Promise<string[]> {
    const filePath = isPrivate? `${path}` : `common/${path}`;
    return await this.fileHandler.getLibraryFileNames(filePath);
  }
}

export default LibraryManager;
