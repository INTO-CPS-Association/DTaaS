import { Injectable } from '@nestjs/common';
import { IFilesService } from './interfaces/files.service.interface.js';
import Config from 'src/config/config.service.js';

@Injectable()
export default class FilesServiceFactory {
  static async create(
    configService: Config,
    fileServices: IFilesService[],
  ): Promise<IFilesService> {
    const mode = configService.getMode();
    const service = fileServices.find((s) => s.getMode() == mode);

    if (service == undefined) {
      throw new Error(`Invalid MODE: ${mode}`);
    } else {
      await service.init();
    }
    return service;
  }
}
