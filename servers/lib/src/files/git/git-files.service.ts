import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_SERVICE } from '../../config/config.interface.js';
import LocalFilesService from '../local/local-files.service.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as http from 'isomorphic-git/http/node/index.cjs';
import { GitRepo } from 'src/config/config.model.js';
import { ConsoleLogger } from '../../util/logger.js';
import Config from '../../config/config.service.js';
import { Project } from 'src/types.js';
import * as git from 'isomorphic-git';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export default class GitFilesService implements IFilesService {
  private readonly dataPath: string;
  private readonly logger: Logger;
  @Inject(LocalFilesService) private localFilesService: LocalFilesService;

  constructor(@Inject(CONFIG_SERVICE) private configService: Config) {
    this.dataPath = this.configService.getLocalPath();
    this.logger = new ConsoleLogger(GitFilesService.name);
  }

  private async cloneRepositories(): Promise<void> {
    const userRepoConfigs = this.configService.getGitRepos();  // Returns an ARRAY of type '{ [key: string]: GitRepo }';;
    const clonePromises: Promise<void>[] = [];                 // An array of promises of type void meant to store the promises of the git.clone() method.;
    userRepoConfigs.forEach((configObj) => {                   // The userRepoConfigs is of type { [key: string]: GitRepo }[] so in this foreach loop we say for each '{ [key: string]: GitRepo }' object in the array do the following:
      Object.keys(configObj).forEach((userKey) => {            // Take the { [key: string]: GitRepo } object and for each key (The name of the repo object think user1 or user2 or common) do the following:
        const gitRepo: GitRepo = configObj[userKey];           // Assign the v̲a̲l̲u̲e̲ of the key to the variable 'g̲i̲t̲R̲e̲p̲o̲' that being the G̲i̲t̲R̲e̲p̲o̲ object;
        const repoUrl: string = gitRepo['repo-url'];           // Assign the v̲a̲l̲u̲e̲ of the key (string) 'repo-url' to the variable 'r̲e̲p̲o̲U̲r̲l̲';
        const httpToken: string = gitRepo['http-token'];       // Assign the v̲a̲l̲u̲e̲ of the key (string) 'http-token' to the variable 'h̲t̲t̲p̲T̲o̲k̲e̲n̲';
        const clonePromise = git.clone({                       // Assign the promise of the git.clone() method to the variable 'c̲l̲o̲n̲e̲P̲r̲o̲m̲i̲s̲e̲';
          fs,
          http,
          dir: path.join(this.dataPath, userKey), // e.g. "path/to/dir/user1"
          gitdir: path.join(this.dataPath, 'gitdir', userKey, '.git'),
          url: this.buildAuthUrl(repoUrl, httpToken),
          singleBranch: true,
          depth: 1,
        }).then(() => this.logger.log(`Done cloning ${repoUrl}`));
        clonePromises.push(clonePromise);
      });
    });
    await Promise.all(clonePromises);
  }




  private buildAuthUrl(repoUrl: string, httpToken?: string): string {
    return httpToken ? `https://${httpToken}@${repoUrl.replace('https://', '')}` : repoUrl;
  }

  init(): Promise<void> {
    return this.cloneRepositories();
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
