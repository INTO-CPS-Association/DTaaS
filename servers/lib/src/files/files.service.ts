import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  getFilesInDirectory(dirPath: string) {
    return fs.readdirSync(dirPath);
  }
}
