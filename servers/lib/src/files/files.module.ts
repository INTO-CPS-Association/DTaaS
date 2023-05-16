import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FilesResolver } from "./files.resolver";
import { LocalFilesService } from "./services/local-files.service";
import { GitlabFilesService } from "./services/gitlab-files.service";
import { DataSourceService } from "./services/data-source.service";
@Module({
  providers: [
    FilesResolver,
    LocalFilesService,
    GitlabFilesService,
    DataSourceService,
    ConfigService,
  ],
})
export class FilesModule {}
