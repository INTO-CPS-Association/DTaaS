export default interface CMDRunner {
  run(): Promise<boolean>;
  checkLogs(): Map<string, string>;
}
