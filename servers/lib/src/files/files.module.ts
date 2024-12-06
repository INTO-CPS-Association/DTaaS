import { Module } from '@nestjs/common';
import FilesResolver from './files.resolver.js';
import { GitFilesModule } from './git/git-files.module.js';
import { LocalFilesModule } from './local/local-files.module.js';
import LocalFilesService from './local/local-files.service.js';
import GitFilesService from './git/git-files.service.js';
import { FILE_SERVICE } from './interfaces/files.service.interface.js';
import FilesServiceFactory from './files-service.factory.js';
import { CONFIG_SERVICE, IConfig } from '../config/config.interface.js';

@Module({
  imports: [LocalFilesModule, GitFilesModule],
  providers: [
    FilesResolver,
    {
      provide: FILE_SERVICE,
      useFactory: (
        configService: IConfig,
        localFilesService: LocalFilesService,
        gitFilesService: GitFilesService,
      ) => {
        const fileServices = [localFilesService, gitFilesService];
        return FilesServiceFactory.create(configService, fileServices);
      },
      inject: [CONFIG_SERVICE, LocalFilesService, GitFilesService],
    },
  ],
})
export default class FilesModule {}
