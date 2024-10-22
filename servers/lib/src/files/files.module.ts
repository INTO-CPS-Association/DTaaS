import { Module } from '@nestjs/common';
import FilesResolver from './resolvers/files.resolver.js';
import { GitFilesModule } from './modules/git-files.module.js';
import { LocalFilesModule } from './modules/local-files.module.js';
import LocalFilesService from './services/local-files.service.js';
import GitFilesService from './services/git-files.service.js';
import { FILE_SERVICE } from './interfaces/files.service.interface.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import FilesServiceFactory from './services/files-service.factory.js';

@Module({
  imports: [LocalFilesModule, GitFilesModule, ConfigModule],
  providers: [
    FilesResolver,
    {
      provide: FILE_SERVICE,
      useFactory: (
        configService: ConfigService,
        localFileService: LocalFilesService,
        gitFilesService: GitFilesService,
      ) => {
        return new FilesServiceFactory(
          configService,
          localFileService,
          gitFilesService,
        ).create();
      },
      inject: [ConfigService, LocalFilesService, GitFilesService],
    },
  ],
})
export default class FilesModule {}
