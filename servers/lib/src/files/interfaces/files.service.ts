export interface FilesService {
  listDirectory(path: string): Promise<string[]>;
  readFile(path: string): Promise<string[]>;
}
