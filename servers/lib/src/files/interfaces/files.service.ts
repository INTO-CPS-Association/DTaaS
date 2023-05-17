import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LocalFilesService } from "../services/local-files.service";
import { GitlabFilesService } from "../services/gitlab-files.service";

// FileService interface
export interface FilesService {
  getFiles(path: string): Promise<string[]>;
  getFileContent(path: string): Promise<string[]>;
}

// FileServiceFactory
@Injectable()
export class FilesServiceFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly localFilesService: LocalFilesService,
    private readonly gitlabFilesService: GitlabFilesService
  ) {}

  create(): FilesService {
    const mode = this.configService.get("MODE");

    if (mode === "local") {
      return this.localFilesService;
    } else if (mode === "gitlab") {
      return this.gitlabFilesService;
    }

    throw new Error(`Unsupported mode: ${mode}`);
  }
}

// FilesService
@Injectable()
export class FilesService {
  private fileService: FilesService;

  constructor(filesServiceFactory: FilesServiceFactory) {
    this.fileService = filesServiceFactory.create();
  }

  readFile(path: string): Promise<string[]> {
    return this.fileService.readFile(path);
  }

  listDirectory(path: string): Promise<string[]> {
    return this.fileService.listDirectory(path);
  }
}
