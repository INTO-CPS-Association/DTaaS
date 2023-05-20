import { Project, Tree } from "src/types";

// FileService interface
export interface IFilesService {
  listDirectory(path: string): Promise<Project>;
}
