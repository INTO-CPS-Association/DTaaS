export type CorsAllowOrigin = string | string[];

export interface IConfig {
  loadConfig(configPath?: string): void;
  getHostname(): string;
  getPort(): number;
  getCorsAllowOrigin(): CorsAllowOrigin;
  getCorsAllowCredentials(): boolean;
  getAuthToken(): string;
  getTls(): boolean;
  getCertsDirectory(): string;
  getLogFilePath(): string;
  getMaxPayloadBytes(): number;
  getLogMaxBytes(): number;
  getLogRetentionFiles(): number;
  getThrottleTtl(): number;
  getThrottleLimit(): number;
}
