import { GitRepo } from './config.model';

export const CONFIG_SERVICE = 'CONFIG_SERVICE';

export interface IConfig {
  loadConfig(configPath: string): Promise<void>;
  getLocalPath(): string;
  getApolloPath(): string;
  getMode(): string;
  getPort(): number;
  getLogLevel(): string;
  getGraphqlPlayground(): string;
  getGitRepos(): { [key: string]: GitRepo }[];
}
