import { Injectable } from '@nestjs/common';
import { IFilesService } from './interfaces/files.service.interface.js';
import { IConfig } from 'src/config/config.interface.js';

@Injectable()
export default class FilesServiceFactory {
  static async create(
    configService: IConfig,
    fileServices: IFilesService[],
  ): Promise<IFilesService> {
    const mode = configService.getMode();
    const service = fileServices.find((s) => s.getMode() == mode);

    if (service == undefined) {
      throw new Error(`Invalid MODE: ${mode}`);
    } else {
      service.init();
    }
    return service;
  }
}
