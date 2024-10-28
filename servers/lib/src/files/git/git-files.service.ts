import { Injectable } from '@nestjs/common';
import { Project } from 'src/types.js';
import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';

@Injectable()
export default class GitFilesService implements IFilesService {
  private readonly dataPath: string;

  constructor() {
    this.dataPath = ''; //Should be set from config service
  }
  getMode(): CONFIG_MODE {
    return CONFIG_MODE.GIT;
  }

  listDirectory(): Promise<Project> {
    throw new Error('Method not implemented.');
  }
  readFile(): Promise<Project> {
    throw new Error('Method not implemented.');
  }
}
