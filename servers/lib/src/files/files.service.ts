import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Injectable()
export class FilesService {
  constructor(
    private configService: ConfigService
  ) {
    const dataPath = this.configService.get('PATH')
    // ensuring that the ENV variable is set correctly, else, error is thrown
    if (!dataPath) {
      throw new Error('DATA_PATH environment variable not set')
    }
  }

  getFilesInDirectory(path: string) {
    const dataPath = this.configService.get('DATA_PATH');
    const fullpath = join(dataPath,path)
    return fs.readdirSync(fullpath);
  }
}
