export interface IConfig {
  getPort(): number;
  getLogFilePath(): string;
  getMaxPayloadBytes(): number;
}
