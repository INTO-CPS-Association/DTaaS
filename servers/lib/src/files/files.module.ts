import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FilesResolver } from "./files.resolver";
import { FilesService } from "./files.service";
@Module({
  providers: [FilesResolver, FilesService, ConfigService],
})
export class FilesModule {}
