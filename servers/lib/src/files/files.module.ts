import { Module } from '@nestjs/common';
import FilesResolver from './resolvers/files.resolver';
import FilesServiceFactory from './services/files-service.factory';
import LocalFilesService from './services/local-files.service';

@Module({
  providers: [FilesResolver, LocalFilesService, FilesServiceFactory],
})
export default class FilesModule {}
