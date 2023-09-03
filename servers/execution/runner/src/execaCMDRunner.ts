import { execa } from 'execa';
import getStream from 'get-stream';
import CMDRunner from './CMDRunner';

export default class ExecaCMDRunner implements CMDRunner {
  command: string;

  stdin?: string;

  stdout?: string;

  stderr?: string;

  constructor(command: string) {
    this.command = command;
  }

  async run(): Promise<boolean> {
    let status: boolean = false;

    const childProcess = execa(this.command);
    if (childProcess != null) {
      this.stdout = await getStream(childProcess.stdout!);
      this.stderr = await getStream(childProcess.stderr!);
      status = true;
    }
    return status;
  }

  checkLogs(): Map<string, string> {
    const logs: Map<string, string> = new Map<string, string>();

    if (this.stdout !== undefined) {
      logs.set('stdout', this.stdout);
    } else {
      logs.set('stdout', '');
    }

    if (this.stderr !== undefined) {
      logs.set('stderr', this.stderr);
    } else {
      logs.set('stderr', '');
    }

    return logs;
  }
}
