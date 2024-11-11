import { Inject, Injectable, Logger } from '@nestjs/common';
import { Project } from 'src/types.js';
import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';
import { ConfigService } from '@nestjs/config';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as http from 'isomorphic-git/http/node/index.cjs';
import LocalFilesService from '../local/local-files.service.js';

@Injectable()
export default class GitFilesService implements IFilesService {
  private readonly dataPath: string;
  private readonly logger: Logger;
  @Inject(LocalFilesService) private localFilesService: LocalFilesService;

  constructor(private configService: ConfigService) {
    this.dataPath = this.configService.get('LOCAL_PATH');
    this.logger = new Logger(GitFilesService.name);
  }

  
  async init(): Promise<void> {
    await this.cloneRepositories();
  }

  private cloneRepositories(): Promise<void[]> {
    let userRepoUrl = '';
    let userRepoUrls = [];
    let userCounter = 1;
    while (
      (userRepoUrl = this.configService.get(
        `GIT_USER${userCounter}_REPO_URL`,
      )) !== undefined
    ) {
      userRepoUrls.push(
        userRepoUrl.includes('.git') ? userRepoUrl : userRepoUrl + '.git',
      );
      ++userCounter;
    }

    const clonePromises = userRepoUrls.map((userRepoUrl, i) => {
      return git
        .clone({
          fs,
          http,
          dir: this.dataPath + `/user${i + 1}`,
          url: userRepoUrl,
          ref: 'main',
          singleBranch: true,
        })
        .then(() => this.logger.log('done cloning ' + userRepoUrl));
    });

    return Promise.all(clonePromises);
  }

  getMode(): CONFIG_MODE {
    return CONFIG_MODE.GIT;
  }

  listDirectory(path: string): Promise<Project> {
    console.log('listDirectory', path);
    return this.localFilesService.listDirectory(path);
  }

  readFile(path: string): Promise<Project> {
    return this.localFilesService.readFile(path);
  }
}
