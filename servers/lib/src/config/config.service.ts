import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigValues } from './config.model.js';
import resolveFile from './util.js';
import { IConfig } from './config.interface.js';
import dotenv from 'dotenv';

dotenv.config(); // Ensure .env is loaded

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
        let configData = yaml.load(configFile) as ConfigValues;

        // ✅ Replace env variables in configData
        this.configValues = this.replaceEnvVariables(configData);
      } catch (e) {
        this.logger.error('Error loading config file', e);
        process.exit(1);
      }
    }
    this.logger.log('Config loaded', this.configValues);
  }

  /**
   * Replace any environment variables in the YAML config.
   */
  private replaceEnvVariables(config: any): any {
    function replaceValue(value: any): any {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const envVarName = value.slice(2, -1); // Extract variable name
        return process.env[envVarName] || `MISSING_ENV_VAR:${envVarName}`;
      }
      return value;
    }

    // Recursively replace values in config object
    function deepReplace(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(deepReplace);
      } else if (typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(
          Object.entries(obj).map(([key, val]) => [key, deepReplace(replaceValue(val))])
        );
      }
      return replaceValue(obj);
    }

    return deepReplace(config);
  }

  getApolloPath(): string { return this.configValues['apollo-path']; }
  getMode(): string { return this.configValues['mode']; }
  getPort(): number { return this.configValues['port']; }
  getLogLevel(): string { return this.configValues['log-level']; }
  getGraphqlPlayground(): string { return this.configValues['graphql-playground']; }
  getLocalPath(): string { return this.configValues['local-path']; }
  getGitRepos(): any[] { return this.configValues['git-repos']; }
  isDryRun(): boolean { return this.configValues['dry-run'] || false; }
}
