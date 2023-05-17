// FileService interface
export interface IFilesService {
  listDirectory(path: string): Promise<string[]>;
  readFile(path: string): Promise<string[]>;
}
