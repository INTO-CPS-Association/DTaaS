import { execa } from 'execa';
import Runner from './interfaces/runner.interface.js';

export default class ExecaRunner implements Runner {
  command: string;

  stdin?: string;

  stdout?: string;

  stderr?: string;

  constructor(command: string) {
    this.command = command;
  }

  async run(): Promise<boolean> {
    let status: boolean = false;

    try {
      const { stdout, stderr } = await execa(this.command);
      this.stderr = stderr;
      this.stdout = stdout;
      status = true;
    } catch (ENOENT) {
      status = false;
    }

    return status;
  }

  checkLogs(): Map<string, string> {
    const logs: Map<string, string> = new Map<string, string>();

    let stackString: string = this.stdout !== undefined ? this.stdout : '';
    logs.set('stdout', stackString);

    stackString = this.stderr !== undefined ? this.stderr : '';
    logs.set('stderr', stackString);

    return logs;
  }
}
