import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import {
  LibraryManagerInterface,
  FileState,
  FileType,
} from 'model/backend/interfaces/sharedInterfaces';
import FileHandler from 'model/backend/fileHandler';

export function getFilePath(
  file: FileState,
  mainFolderPath: string,
  lifecycleFolderPath: string,
): string {
  return file.type === FileType.LIFECYCLE
    ? lifecycleFolderPath
    : mainFolderPath;
}

class LibraryManager implements LibraryManagerInterface {
  public assetName: string;

  public backend: BackendInterface;

  public fileHandler: FileHandler;

  constructor(assetName: string, backend: BackendInterface) {
    this.assetName = assetName;
    this.backend = backend;
    this.fileHandler = new FileHandler(assetName, backend);
  }

  async getFileContent(
    isPrivate: boolean,
    path: string,
    fileName: string,
  ): Promise<string> {
    const filePath = `${path}/${fileName}`;

    const fileContent = await this.fileHandler.getFileContent(
      filePath,
      isPrivate,
    );
    return fileContent;
  }

  async getFileNames(isPrivate: boolean, path: string): Promise<string[]> {
    const fileNames = await this.fileHandler.getLibraryConfigFileNames(
      path,
      isPrivate,
    );
    return fileNames;
  }
}

export default LibraryManager;
