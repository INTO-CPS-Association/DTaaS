export interface IConfig {
  loadConfig(configPath?: string): void;
  getHostname(): string;
  getPort(): number;
  getCorsAllowOrigin(): string;
  getJwt(): string;
  getTls(): boolean;
  getCertsDirectory(): string;
  getLogFilePath(): string;
  getMaxPayloadBytes(): number;
}
