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
const _ContinuedSpacing: string = `                                                         `;
@Injectable()
export default class GitFilesService implements IFilesService {
  private readonly dataPath: string;
  private readonly logger: Logger;
  @Inject(LocalFilesService) private localFilesService: LocalFilesService;

  constructor(@Inject(CONFIG_SERVICE) private configService: Config) {
    this.dataPath = this.configService.getLocalPath();
    this.logger = new Logger(GitFilesService.name);
  }
  //

  init(): Promise<any> { return this.cloneRepositories(); }
  //

  private buildAuthedUrl(repoUrl_: string, httpToken_?: string): string { return httpToken_ ? `https://${httpToken_}@${repoUrl_.replace('https://', '')}` : repoUrl_; }
  //

  private async cloneRepositories(): Promise<void[]> {
    const userRepoConfigs = this.configService.getGitRepos();    // █ NOTE 0┆0 0 █: this line seems to access the 'libms.yaml' file;
    if (!userRepoConfigs || userRepoConfigs.length === 0) { throw new Error('No git repos found in config'); }

    return Promise.all(
      userRepoConfigs.map(async (repoConf) => {                  // █ NOTE 0┆0 1 █: This line seems to extract content from the .yaml file; 
        const user: string = Object.keys(repoConf)[0];           // █ NOTE 0┆0 2 █: Seems to take each key from the key-value pair from the .yaml file;
        const repoConfig = repoConf[user];                       // █ NOTE 0┆0 3 █: 'repoConfig' Seems to contain each 'git-repo' object (don't know what to call the key-value in a filed of .yaml yet );
        const repoUrl = repoConfig['repo-url'];                  // █ NOTE 0┆0 4 █: From the object extracted, the 'const repoUrl' is must likely the url of the libms.yaml file. basically the user's choice of repo to clone;
        const httpToken = repoConfig['http-token'];              // █ NOTE 0┆0 5 █: Should be self-explanatory, but just to be sure, this is likely the Personal Access Token for the repo;
        const cloneDir: string = path.join(this.dataPath, user); // █ NOTE 0┆0 6 █: The url of the cloned directory?;
        const gitDir: string = path.join(this.dataPath, 'gitdir', user, '.git');// █ NOTE 0┆0 7 █: The Path to where the directory gets cloned to;

        //                                                          █ NOTE 1┆0 1 █: The line below is const string error-message. Used if git 
        //                                                          █            █      cloning gives '401 Unauthorized error'. User then  
        //                                                          █            █      informed to provide valid personal access token. 
        //                                                          █            █      This happens if user try cloning private repo with no
        //                                                          █            █      valid PAT given or any given at all; 
        const UnauthMsg: string = `Authentication failed for ${repoUrl}. \n \x1b[30m  ${_ContinuedSpacing}   \x1b[43mThis repository require a valid personal access token. Please provide one \x1b[0m \x1b[0m \n ${_ContinuedSpacing}     \x1b[43 \x1b[43min your configuration.\x1b[0m \x1b[0m`;

        try {
          this.logger.debug(`Beginning cloning ${repoUrl} \n into working directory: ${cloneDir} ...`);
          await git.clone({                               //        █ NOTE 2┆0 0 █: the beginning of the git repo cloning; 
            fs,                                           //        █ NOTE 2┆0 1 █: File system; 
            http,                                         //        █ NOTE 2┆0 2 █: From isomorphic-git, the http object. more information is pending; 
            dir: cloneDir,                                //        █ NOTE 2┆0 3 █: the working directory where the repository files will be cloned (i.e., checked out).; 
            gitdir: gitDir,                               //        █ NOTE 2┆0 4 █: the directory where Git metadata (the .git folder) will be stored.;
            url: this.buildAuthedUrl(repoUrl, httpToken), //        █ NOTE 2┆0 5 █: the URL from which the repository will be cloned. As explained, it may include the access token.;
            singleBranch: true,                           //        █ NOTE 2┆0 6 █: tells Git to clone only the currently active branch, not the entire repository with all branches.;
            depth: 1,                                     //        █ NOTE 2┆0 7 █: This performs a shallow clone, meaning it only fetches the latest commit. This speeds up cloning and reduces disk space.;
          });

          this.logger.log(`\x1b[32mSuccessfully\x1b[0m cloned ${repoUrl}`);
        } catch (error: any) {
          if (error.message && error.message.includes("401 Unauthorized")) { this.logger.error(UnauthMsg); }
          else {
            this.logger.error(`\x1b[31m Failed to clone ${repoUrl} \x1b[0m \n: ${error.message}`);
            this.logger.debug(error.stack);
          }
        }
      })
    );
  }
  //



  getMode(): CONFIG_MODE { return CONFIG_MODE.GIT; }
  //
  listDirectory(path: string): Promise<Project> { return this.localFilesService.listDirectory(path); }
  //
  readFile(path: string): Promise<Project> { return this.localFilesService.readFile(path); }
  //
}
