import { Inject, Injectable, Logger } from '@nestjs/common';
import { Project } from 'src/types.js';
import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as http from 'isomorphic-git/http/node/index.cjs';
import LocalFilesService from '../local/local-files.service.js';
import Config from '../../config/config.service.js';

@Injectable()
export default class GitFilesService implements IFilesService {
  private readonly dataPath: string;
  private readonly logger: Logger;
  @Inject(LocalFilesService) private localFilesService: LocalFilesService;

  constructor(private configService: Config) {
    this.dataPath = this.configService.getLocalPath();
    this.logger = new Logger(GitFilesService.name);
  }

  async init(): Promise<void> {
    await this.cloneRepositories();
  }

  private cloneRepositories(): Promise<void[]> {
    const userRepoConfigs = this.configService.getGitRepos();
    
    const clonePromises = userRepoConfigs.map((repoConf) => {
      const user = Object.keys(repoConf)[0];
      const repoUrl = repoConf[user]['repo-url'];

      return git
        .clone({
          fs,
          http,
          dir: this.dataPath + `/${user}`,
          url: repoUrl.includes('.git') ? repoUrl : repoUrl + '.git',
          ref: 'main',
          singleBranch: true,
          depth: 1,
        })
        .then(() => this.logger.log('done cloning ' + repoUrl));
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
