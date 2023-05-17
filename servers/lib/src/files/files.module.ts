import { Module } from "@nestjs/common";
import { FilesResolver } from "./files.resolver";
import { LocalFilesService } from "./services/local-files.service";
import { GitlabFilesService } from "./services/gitlab-files.service";
import { FilesServiceFactory } from "./services/files-service.factory";
@Module({
  providers: [
    FilesResolver,
    LocalFilesService,
    GitlabFilesService,
    FilesServiceFactory,
  ],
})
export class FilesModule {}
