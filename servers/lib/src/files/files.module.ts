import { Module } from '@nestjs/common';
import FilesResolver from './resolvers/files.resolver.js';
import FilesServiceFactory from './services/files-service.factory.js';
import { GitFilesModule } from './modules/git-files.module.js';
import { LocalFilesModule } from './modules/local-files.module.js';

@Module({
  imports: [
    LocalFilesModule,
    GitFilesModule,
  ],
  providers: [
    FilesResolver,
    FilesServiceFactory,
  ],
})
export default class FilesModule {}
