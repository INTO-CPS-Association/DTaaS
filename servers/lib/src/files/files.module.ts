import { Module } from '@nestjs/common';
import FilesResolver from './resolvers/files.resolver.js';
import FilesServiceFactory from './services/files-service.factory.js';
import LocalFilesService from './services/local-files.service.js';

@Module({
  providers: [FilesResolver, LocalFilesService, FilesServiceFactory],
})
export default class FilesModule {}
