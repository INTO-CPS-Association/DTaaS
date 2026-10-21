export interface IConfig {
  loadConfig(configPath?: string): void;
  getHostname(): string;
  getPort(): number;
  getRoutePrefix(): string;
}
