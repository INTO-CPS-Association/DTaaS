import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFilesService } from './interfaces/files.service.interface.js';

@Injectable()
export default class FilesServiceFactory {
  static async create(
    configService: ConfigService,
    fileServices: IFilesService[],
  ): Promise<IFilesService> {
    const mode = configService.get<string>('MODE');
    const service = fileServices.find((s) => s.getMode() == mode);

    if (service == undefined) {
      throw new Error(`Invalid MODE: ${mode}`);
    } else {
      await service.init();
    }
    return service;
  }
}
