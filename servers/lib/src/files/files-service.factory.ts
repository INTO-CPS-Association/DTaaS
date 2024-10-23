import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFilesService } from './interfaces/files.service.interface.js';
import { CONFIG_MODE } from '@/enums/config-mode.enum.js';

@Injectable()
export default class FilesServiceFactory {
  static create(
    configService: ConfigService,
    fileServices: Map<CONFIG_MODE, IFilesService>,
  ): IFilesService {
    const mode = configService.get<string>('MODE');

    const service = fileServices.get(CONFIG_MODE[mode]);
    if (!service) {
      throw new Error(`Invalid MODE: ${mode}`);
    }

    return service;
  }
}
