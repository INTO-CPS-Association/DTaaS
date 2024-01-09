import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFilesService } from '../interfaces/files.service.interface';
import LocalFilesService from './local-files.service';

@Injectable()
export default class FilesServiceFactory {
  /* eslint-disable no-useless-constructor, no-empty-function */
  constructor(
    private configService: ConfigService,
    @Inject(LocalFilesService) private localFilesService: LocalFilesService,
  ) {}
  /* eslint-enable no-useless-constructor, no-empty-function */

  create(): IFilesService {
    const mode = this.configService.get<string>('MODE');
    if (mode === 'local') {
      return this.localFilesService;
    } else {
      throw new Error(`Invalid MODE: ${mode}`);
    }
  }
}
