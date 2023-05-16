import { Injectable } from "@nestjs/common";
import { FilesService } from "../interfaces/files.service";
import { LocalFilesService } from "./local-files.service";
import { GitlabFilesService } from "./gitlab-files.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DataSourceService implements FilesService {
  constructor(
    private readonly localFilesService: LocalFilesService,
    private readonly gitlabFilesService: GitlabFilesService,
    private readonly configService: ConfigService
  ) {}

  async listDirectory(path: string): Promise<string[]> {
    const mode = this.configService.get("MODE");

    if (mode === "local") {
      return this.localFilesService.listDirectory(path);
    } else if (mode === "gitlab") {
      return this.gitlabFilesService.listDirectory(path);
    }

    return ["Invalid mode"];
  }

  async readFile(path: string): Promise<string[]> {
    const mode = this.configService.get("MODE");

    if (mode === "local") {
      return this.localFilesService.readFile(path);
    } else if (mode === "gitlab") {
      return this.gitlabFilesService.readFile(path);
    }

    return ["Invalid mode"];
  }
}
