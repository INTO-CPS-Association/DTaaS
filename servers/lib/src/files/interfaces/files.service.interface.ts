import { Project } from "src/types";

// FileService interface
export interface IFilesService {
  listDirectory(path: string): Promise<Project>;
  readFile(path: string): Promise<Project>;
}
