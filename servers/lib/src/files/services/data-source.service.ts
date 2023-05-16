import { Injectable, Inject } from "@nestjs/common";
import { FilesService } from "../interfaces/files.service";

@Injectable()
export class DataSourceService implements FilesService {
  constructor(
    private readonly localFilesService: LocalFilesService,
    private readonly gitlabFilesService: GitlabFilesService,
    private readonly configService: ConfigService
  ) {}

  // Implement listDirectory and readFile methods here...
}
