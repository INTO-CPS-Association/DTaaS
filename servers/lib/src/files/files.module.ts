import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FilesResolver } from "./files.resolver";
import { FilesService } from "./interfaces/files.service";
@Module({
  providers: [
    FilesResolver,
    FilesService,
    ConfigService,
    LocalFilesService,
    GitlabFilesService,
  ],
})
export class FilesModule {}
