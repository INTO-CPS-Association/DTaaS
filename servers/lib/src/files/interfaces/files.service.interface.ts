import { Project } from 'src/types.js';

// FileService interface
export interface IFilesService {
  listDirectory(path: string): Promise<Project>;
  readFile(path: string): Promise<Project>;
}
