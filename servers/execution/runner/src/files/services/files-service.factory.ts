import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IFilesService } from "../interfaces/files.service.interface";
import GitlabFilesService from "./gitlab-files.service";
import LocalFilesService from "./local-files.service";

@Injectable()
export default class FilesServiceFactory {
  constructor(
    private configService: ConfigService,
    @Inject(GitlabFilesService) private gitlabFilesService: GitlabFilesService,
    @Inject(LocalFilesService) private localFilesService: LocalFilesService
  ) {}

  create(): IFilesService {
    const mode = this.configService.get<string>("MODE");
    if (mode === "local") {
      return this.localFilesService;
    } if (mode === "gitlab") {
      return this.gitlabFilesService;
    } 
      throw new Error(`Invalid MODE: ${mode}`);
    
  }
}
