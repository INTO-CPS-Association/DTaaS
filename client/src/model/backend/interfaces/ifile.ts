import { FileState } from 'preview/store/file.slice';
import { FileType } from 'preview/util/DTAssets';

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
