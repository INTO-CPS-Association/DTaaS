import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Injectable()
export class FilesService {
  constructor(
    private configService: ConfigService
  ) {}

  getFilesInDirectory(path: string) {
    const dataPath = this.configService.get('LOCAL_PATH');
    const fullpath = join(dataPath,path);
    return fs.readdirSync(fullpath);

  }
}



/*
getFilesInDirectory(path: string) {
    const mode = this.configService.get('MODE');
    if (mode == process.env.local)
    {
      const dataPath = this.configService.get('LOCAL_PATH');
      const fullpath = join(dataPath,path);
      return fs.readdirSync(fullpath);
    }
  }
*/