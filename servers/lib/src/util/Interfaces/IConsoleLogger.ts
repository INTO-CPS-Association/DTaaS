export interface IConsoleLogger {
  ErrorMsg(message: string, maxLineLength: number): void;
  WarningMsg(message: string, maxLineLength: number): void;
  LogMsg(message: string, maxLineLength: number): void;
}
