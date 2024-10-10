import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Project } from 'src/types.js';
import { IFilesService } from '../interfaces/files.service.interface.js';

@Injectable()
export default class GitFilesService implements IFilesService {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private configService: ConfigService) {}

  listDirectory(path: string): Promise<Project> {
    throw new Error('Method not implemented.');
  }
  readFile(path: string): Promise<Project> {
    throw new Error('Method not implemented.');
  }
}
