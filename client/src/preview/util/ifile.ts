import { FileState } from 'preview/store/file.slice';

export interface IFile {
  getFileContent(fileName: string, DTName: string): Promise<string>;
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
  getDescriptionFiles(): Promise<string[]>;
  getConfigFiles(): Promise<string[]>;
  getLifecycleFiles(): Promise<string[]>;
  appendTriggerToPipeline(): Promise<string>;
  removeTriggerFromPipeline(): Promise<string>;
}
