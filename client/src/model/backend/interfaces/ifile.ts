import { FileType } from '../gitlab/constants';
import { FileState } from '../gitlab/UtilityInterfaces';

export interface IFile {
  createFile(
    file: FileState,
    filePath: string,
    commitMessage: string,
  ): Promise<void>;
  updateFile(
    filePath: string,
    updatedContent: string,
    commitMessage: string,
  ): Promise<void>;
  deleteDT(digitalTwinPath: string): Promise<void>;
  getFileContent(filePath: string): Promise<string>;
  getFileNames(fileType: FileType): Promise<string[]>;
}
