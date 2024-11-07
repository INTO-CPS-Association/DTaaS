import { FileState } from 'preview/store/file.slice';
import { FileType } from './fileHandler';

export interface IFile {
  getFileContent(fileName: string): Promise<string>;
  updateFileContent(fileName: string, fileContent: string): Promise<void>;
  createFile(
    file: FileState,
    filePath: string,
    commitMessage: string,
  ): Promise<void>;
  createFiles(
    files: FileState[],
    filePath: string,
    commitMessage: string,
  ): Promise<void>;
  getFileNames(fileType: FileType): Promise<string[]>;
  appendTriggerToPipeline(): Promise<string>;
  removeTriggerFromPipeline(): Promise<string>;
}
