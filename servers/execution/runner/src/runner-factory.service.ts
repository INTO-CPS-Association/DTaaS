import { Injectable } from '@nestjs/common';
import Runner from './interfaces/runner.interface.js';
import ExecaRunner from './execa-runner.js';
import { meterFor } from './resources/meter.js';
import { launchArgs, SETPRIV } from './scripts/launch.js';
import type { ScriptUser } from './scripts/separation.js';

// stopGrace: milliseconds from SIGTERM to SIGKILL on a stop; user: the
// account and the directory that the scripts run in, on Linux only
export type RunnerSettings = { stopGrace?: number; user?: ScriptUser };

@Injectable()
export default class RunnerFactory {
  // Windows can not execute shell scripts, so it runs <script>.ps1 instead;
  // each runner measures its runs as the platform can. With a script
  // account, which the start refuses on Windows, setpriv starts the
  // script in the run directory.
  static create(
    command: string,
    { stopGrace, user }: RunnerSettings = {},
    platform: NodeJS.Platform = process.platform,
  ): Runner {
    const options = { stopGrace, meter: meterFor(platform) };
    if (platform === 'win32') {
      return new ExecaRunner(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', `${command}.ps1`],
        options,
      );
    }
    if (user !== undefined) {
      const args = launchArgs(user.account, command);
      return new ExecaRunner(SETPRIV, args, {
        ...options,
        cwd: user.runDirectory,
      });
    }
    return new ExecaRunner(command, [], options);
  }
}
