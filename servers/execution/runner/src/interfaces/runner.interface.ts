export default interface Runner {
  run(): Promise<boolean>;
  checkLogs(): Map<string, string>;
}
