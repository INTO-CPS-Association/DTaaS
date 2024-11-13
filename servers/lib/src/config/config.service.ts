import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { Injectable, Logger } from '@nestjs/common';
import {ConfigValues, GitRepo } from './config.model.js';
import resolveFile from './util.js';

@Injectable()
export default class Config {
  private configValues: ConfigValues;
  private logger: Logger;

  constructor() {
    this.logger = new Logger(Config.name);
  }

  async loadConfig(configPath: string): Promise<void> {
    if (configPath !== undefined) {
      this.configValues = yaml.load(
        readFileSync(resolveFile(configPath), 'utf8'),
      ) as ConfigValues;
    }
     this.logger.log('Config loaded', this.configValues);
   
  }

  getLocalPath(): string {
    return this.configValues['local-path'];
  }

  getApolloPath(): string {
    return this.configValues['apollo-path'];
  }

  getMode(): string {
    return this.configValues['mode'];
  } 

  getPort(): number {
    return this.configValues['port'];
  }
  getLogLevel(): string {
    return this.configValues['log-level'];
  }
  getGraphqlPlayground(): string {
    return this.configValues['graphql-playground'];
  }
  getGitRepos(): {[key: string]: GitRepo}[] {
    return this.configValues['git-repos'];
  }
}