import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_SERVICE } from '../../config/config.interface.js';
import LocalFilesService from '../local/local-files.service.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as http from 'isomorphic-git/http/node/index.cjs';
import Config from '../../config/config.service.js';
import { ConsoleLogger } from '../../util/logger.js';
import { Project } from 'src/types.js';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as path from 'path';
import { GitRepo } from 'src/config/config.model.js';

const _logger = new ConsoleLogger();

@Injectable()
export default class GitFilesService implements IFilesService {
  private readonly dataPath: string;
  private readonly logger: Logger;
  @Inject(LocalFilesService) private localFilesService: LocalFilesService;


  constructor(@Inject(CONFIG_SERVICE) private configService: Config) {
    this.dataPath = this.configService.getLocalPath();
    this.logger = new Logger(GitFilesService.name);
  }



  init(): Promise<any> { return this.cloneRepositories(); }



  private buildAuthUrl(repoUrl_: string, httpToken_?: string): string { return httpToken_ ? `https://${httpToken_}@${repoUrl_.replace('https://', '')}` : repoUrl_; }



  private async cloneRepositories(): Promise<void[]> {
    const userRepoConfigs = this.configService.getGitRepos() ?? [];
    if (userRepoConfigs.length === 0) {
      throw new Error('No git repos found in config');
    }


    return Promise.all(
      userRepoConfigs.map(async (repoConf) => {
        const user: string = Object.keys(repoConf)[0];
        const repoConfig: GitRepo = repoConf[user];
        const repoUrl: string = repoConfig['repo-url'];
        const httpToken: string = repoConfig['http-token'];
        const cloneDir: string = path.join(this.dataPath);
        const gitDir: string = path.join(this.dataPath, 'gitdir');



        try {
          _logger.LogMsg(`Beginning cloning ${repoUrl} into working directory: ${cloneDir} ...`)
          await git.clone({
            fs,
            http,
            dir: cloneDir,
            gitdir: gitDir,
            url: this.buildAuthUrl(repoUrl, httpToken),
            singleBranch: true,
            depth: 1,
          });
          _logger.LogMsg(`Successfully cloned ${repoUrl}`)


        } catch (err: unknown) {
          if (err instanceof Error) {
            if (err.message.includes('401 Unauthorized')) { } else { this.logger.debug(err.stack); }
          }
          else { this.logger.error('Unknown error occurred', err); }
        }

      })
    );
  }

  getMode(): CONFIG_MODE { return CONFIG_MODE.GIT; }
  listDirectory(path: string): Promise<Project> { return this.localFilesService.listDirectory(path); }
  readFile(path: string): Promise<Project> { return this.localFilesService.readFile(path); }

}
