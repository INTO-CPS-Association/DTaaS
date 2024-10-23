import { Project } from 'src/types.js';

export const FILE_SERVICE = 'FILE_SERVICE';
// FileService interface
export interface IFilesService {
  listDirectory(path: string): Promise<Project>;
  readFile(path: string): Promise<Project>;
  getFileMode(): string;
}
