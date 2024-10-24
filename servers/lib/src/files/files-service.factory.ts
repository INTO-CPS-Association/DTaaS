import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFilesService } from './interfaces/files.service.interface.js';

@Injectable()
export default class FilesServiceFactory {
  static create(
    configService: ConfigService,
    fileServices: IFilesService[],
  ): IFilesService {
    const mode = configService.get<string>('MODE');
    const service = fileServices.find((s) => s.getMode() == mode);

    if (service != undefined) {
      throw new Error(`Invalid MODE: ${mode}`);
    }
    return service;
  }
}
