import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigValues, GitRepo } from './config.model.js';
import resolveFile from './util.js';
import { IConfig } from './config.interface.js';

@Injectable()
export default class Config implements IConfig {
  private configValues: ConfigValues;
  private logger: Logger;

  constructor() {
    this.logger = new Logger(Config.name);
  }

  async loadConfig(configPath: string): Promise<void> {
    if (configPath !== undefined) {
      try {
        const configFile = readFileSync(resolveFile(configPath), 'utf8');
        this.configValues = yaml.load(configFile) as ConfigValues;
      } catch (e) {
        this.logger.error('Error loading config file', e);
        process.exit(1);
      }
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
  getGitRepos(): { [key: string]: GitRepo }[] {
    return this.configValues['git-repos'];
  }
}
