import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IFilesService } from "../interfaces/files.service.interface";
import { GitlabFilesService } from "./gitlab-files.service";

@Injectable()
export class FilesServiceFactory {
  constructor(
    private configService: ConfigService,
    @Inject(GitlabFilesService) private gitlabFilesService: GitlabFilesService
  ) {}

  create(): IFilesService {
    const mode = this.configService.get<string>("MODE");
    if (mode === "local") {
      return this.gitlabFilesService;
    } else if (mode === "gitlab") {
      return this.gitlabFilesService;
    } else {
      throw new Error(`Invalid MODE: ${mode}`);
    }
  }
}
