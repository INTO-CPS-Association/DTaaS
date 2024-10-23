import { Injectable } from '@nestjs/common';
import { Project } from 'src/types.js';
import { IFilesService } from '../interfaces/files.service.interface.js';

@Injectable()
export default class GitFilesService implements IFilesService {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor() {}
  getFileMode(): string {
    return 'git';
  }

  listDirectory(): Promise<Project> {
    throw new Error('Method not implemented.');
  }
  readFile(): Promise<Project> {
    throw new Error('Method not implemented.');
  }
}
