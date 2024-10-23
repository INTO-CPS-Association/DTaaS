import { Module } from '@nestjs/common';
import FilesResolver from './resolvers/files.resolver.js';
import { GitFilesModule } from './git/git-files.module.js';
import { LocalFilesModule } from './local/local-files.module.js';
import LocalFilesService from './local/local-files.service.js';
import GitFilesService from './git/git-files.service.js';
import { FILE_SERVICE, IFilesService } from './interfaces/files.service.interface.js';
import FilesServiceFactory from './services/files-service.factory.js';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [LocalFilesModule, GitFilesModule],
  providers: [
    FilesResolver,
    {
      provide: FILE_SERVICE,
      useFactory: (
        configService: ConfigService,
        localFilesService: LocalFilesService,
        gitFilesService: GitFilesService,
      ) => {
        const fileServices = new Map<string, IFilesService>([
          [localFilesService.getFileMode(), localFilesService],
          [gitFilesService.getFileMode(), gitFilesService],
        ]);
        return FilesServiceFactory.create(
          configService,
          fileServices,
        );
      },
      inject: [ConfigService, LocalFilesService, GitFilesService],
    },
  ],
})
export default class FilesModule {}
