import { Inject, Injectable, Logger } from '@nestjs/common';
import { Project } from 'src/types.js';
import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import http from 'isomorphic-git/http/node';
import LocalFilesService from '../local/local-files.service.js';
import Config from '../../config/config.service.js';
import { CONFIG_SERVICE } from '../../config/config.interface.js';
import path from 'path';

@Injectable()
export default class GitFilesService implements IFilesService {
  private readonly dataPath: string;
  private readonly logger: Logger;
  @Inject(LocalFilesService) private localFilesService: LocalFilesService;

  constructor(@Inject(CONFIG_SERVICE) private configService: Config) {
    this.dataPath = this.configService.getLocalPath();
    this.logger = new Logger(GitFilesService.name);
  }

  init(): Promise<any> {
    return this.cloneRepositories();
  }

  private cloneRepositories(): Promise<void[]> {
    const userRepoConfigs = this.configService.getGitRepos();

    if (!userRepoConfigs || userRepoConfigs.length === 0) {
      throw new Error('No git repos found in config');
    }

    const clonePromises = userRepoConfigs.map((repoConf) => {
      const user = Object.keys(repoConf)[0];
      const repoUrl = repoConf[user]['repo-url'];

      return git
        .clone({
          fs,
          http,
          dir: this.dataPath + `/${user}`,
          gitdir: path.join(this.dataPath, 'gitdir', user, '.git'),
          url: repoUrl.includes('.git') ? repoUrl : repoUrl + '.git',
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
    return this.localFilesService.listDirectory(path);
  }

  readFile(path: string): Promise<Project> {
    return this.localFilesService.readFile(path);
  }
}
