import { Module } from '@nestjs/common';
import FilesResolver from './files.resolver.js';
import { GitFilesModule } from './git/git-files.module.js';
import { LocalFilesModule } from './local/local-files.module.js';
import LocalFilesService from './local/local-files.service.js';
import GitFilesService from './git/git-files.service.js';
import {
  FILE_SERVICE,
  IFilesService,
} from './interfaces/files.service.interface.js';
import FilesServiceFactory from './files-service.factory.js';
import { ConfigService } from '@nestjs/config';
import { CONFIG_MODE } from '@/enums/config-mode.enum.js';

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
        const fileServices = new Map<CONFIG_MODE, IFilesService>([
          [localFilesService.getMode(), localFilesService],
          [gitFilesService.getMode(), gitFilesService],
        ]);
        return FilesServiceFactory.create(configService, fileServices);
      },
      inject: [ConfigService, LocalFilesService, GitFilesService],
    },
  ],
})
export default class FilesModule {}
