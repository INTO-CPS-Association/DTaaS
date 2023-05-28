import { Module } from "@nestjs/common";
import { FilesResolver } from "./files.resolver";
import { GitlabFilesService } from "./services/gitlab-files.service";
import { FilesServiceFactory } from "./services/files-service.factory";
import { LocalFilesService } from "./services/local-files.service";
@Module({
  providers: [
    FilesResolver,
    LocalFilesService,
    GitlabFilesService,
    FilesServiceFactory,
  ],
})
export class FilesModule {}
