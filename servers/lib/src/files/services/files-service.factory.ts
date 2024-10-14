import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFilesService } from '../interfaces/files.service.interface.js';
import LocalFilesService from './local-files.service.js';
import GitFilesService from './git-files.service.js';

@Injectable()
export default class FilesServiceFactory {
  /* eslint-disable no-useless-constructor, no-empty-function */
  constructor(
    private configService: ConfigService,
    @Inject(LocalFilesService) private localFilesService: LocalFilesService,
    @Inject(GitFilesService) private gitFilesService: GitFilesService,
  ) {}
  /* eslint-enable no-useless-constructor, no-empty-function */

  create(): IFilesService {
    const mode = this.configService.get<string>('MODE');
    switch (mode) {
      case 'local':
        return this.localFilesService;
      case 'git':
        return this.gitFilesService;
      default:
        throw new Error(`Invalid MODE: ${mode}`);
    }
  }
}
