import { IFilesService } from '../interfaces/files.service.interface.js';
import { CONFIG_SERVICE } from '../../config/config.interface.js';
import LocalFilesService from '../local/local-files.service.js';
import { CONFIG_MODE } from '../../enums/config-mode.enum.js';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as http from 'isomorphic-git/http/node/index.cjs';
import Config from '../../config/config.service.js';
import { Project } from 'src/types.js';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
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
  init(): Promise<any> { return this.cloneRepositories(); }
  /*
  
  
  
  
  */
  private async cloneRepositories(): Promise<void[]> {
    const userRepoConfigs = this.configService.getGitRepos();
    if (!userRepoConfigs || userRepoConfigs.length === 0) { throw new Error('No git repos found in config'); }

    return Promise.all(
      userRepoConfigs.map(async (repoConf) => {
        const user = Object.keys(repoConf)[0];
        const repoConfig = repoConf[user];
        const repoUrl = repoConfig['repo-url'];
        const httpToken = repoConfig['http-token'];
        const cloneDir = path.join(this.dataPath, user);
        const gitDir = path.join(this.dataPath, 'gitdir', user, '.git');


        try {
          // ████████▀  Safety Rail 1: Cleanup  ▄████████
          await this.forceCleanup(cloneDir, gitDir);
          //

          // ████▀  Safety Rail 2: Validate Config  ▄████
          if (!repoUrl) { throw new Error(`Missing repo-url for user ${user}`); }
          //

          // ██████▀  Safety Rail 3: Token Check  ▄██████
          if (this.isPrivateRepo(repoUrl)) {
            if (!httpToken) throw new Error(`Missing http-token for private repo: ${repoUrl}`);
            if (httpToken.includes('DUMMY')) throw new Error(`Invalid dummy token for repo: ${repoUrl}`);
          }
          //





          // === Clone Repo ===
          this.logger.debug(`Cloning ${repoUrl} into working directory: ${cloneDir}`);
          await git.clone({
            fs,
            http,
            dir: cloneDir,
            gitdir: gitDir,
            url: this.buildAuthedUrl(repoUrl, httpToken),
            singleBranch: true,
            depth: 1,

          });

          this.logger.log(`Successfully cloned ${repoUrl}`);
        } catch (error) {
          this.logger.error(`Failed to clone ${repoUrl}: ${error.message}`);
          this.logger.debug(error.stack);
        }
      })
    );
  }

  /*
 
 
 
 
*/


  private isPrivateRepo(repoUrl: string): boolean {
    // Only flag repos as private if they’re from a domain requiring tokens  
    const privateHosts = ['github.com']; // GitLab is public here  
    return privateHosts.some(host => repoUrl.includes(host));
  }

  private async repoExists(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.access(dirPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private buildAuthedUrl(repoUrl: string, httpToken?: string): string {
    return httpToken
      ? `https://${httpToken}@${repoUrl.replace('https://', '')}`
      : repoUrl;
  }




  private async forceCleanup(...paths: string[]): Promise<void> {
    for (const dir of paths) {
      if (await this.repoExists(dir)) {
        this.logger.log(`Deleting existing directory: ${dir}`);
        await fs.promises.rm(dir, { recursive: true, force: true });
      }
    }
  }

  getMode(): CONFIG_MODE { return CONFIG_MODE.GIT; }
  listDirectory(path: string): Promise<Project> { return this.localFilesService.listDirectory(path); }
  readFile(path: string): Promise<Project> { return this.localFilesService.readFile(path); }
}
