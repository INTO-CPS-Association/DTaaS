import { Module } from "@nestjs/common";
import { FilesResolver } from "./files.resolver";
import { GitlabFilesService } from "./services/gitlab-files.service";
import { FilesServiceFactory } from "./services/files-service.factory";
@Module({
  providers: [FilesResolver, GitlabFilesService, FilesServiceFactory],
})
export class FilesModule {}
