import { Injectable } from '@nestjs/common';
import Runner from './interfaces/runner.interface.js';
import ExecaRunner from './execa-runner.js';

@Injectable()
export default class RunnerFactory {
  // Windows can not execute shell scripts, so it runs <script>.ps1 instead
  static create(
    command: string,
    platform: NodeJS.Platform = process.platform,
  ): Runner {
    if (platform === 'win32') {
      return new ExecaRunner('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        `${command}.ps1`,
      ]);
    }
    return new ExecaRunner(command);
  }
}
