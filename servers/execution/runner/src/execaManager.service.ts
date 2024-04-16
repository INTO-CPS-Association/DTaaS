import { join } from 'path';
import {
  Command,
  Manager,
  CommandStatus,
} from './interfaces/command.interface.js';
import ExecaRunner from './execaRunner.js';
import Queue from './queue.service.js';
import readConfig from './config/configuration.js';
import Config from './config/Config.interface.js';
import { ExecuteCommandDto } from './dto/command.dto.js';

const config: Config = readConfig();

export default class ExecaManager implements Manager {
  private commandQueue: Queue = new Queue();

  async changePhase(name: string): Promise<[boolean, Map<string, string>]> {
    const command: Command = {
      name,
      status: 'invalid',
      task: new ExecaRunner(''),
      // task attribute is deliberately left empty
    };

    let success: boolean = false;

    command.task = new ExecaRunner(join(process.cwd(), config.location, name));
    this.commandQueue.enqueue(command);
    await command.task.run().then((value) => {
      success = value;
      if (success) command.status = 'valid';
    });
    return [success, command.task.checkLogs()];
  }

  checkPhase(): CommandStatus {
    let commandStatus: CommandStatus;
    const logs: Map<string, string> = new Map<string, string>();
    const command: Command | undefined = this.commandQueue.activePhase();

    logs.set('stdout', '');
    logs.set('stderr', '');
    if (command === undefined) {
      commandStatus = {
        name: 'none',
        status: 'invalid',
        logs: {
          stdout: '',
          stderr: '',
        },
      };
    } else {
      commandStatus = {
        name: command.name,
        status: command.status,
        logs: {
          stdout: command.task.checkLogs().get('stdout'),
          stderr: command.task.checkLogs().get('stderr'),
        },
      };
      // console.log(command.task.checkLogs());
    }
    return commandStatus;
  }

  checkHistory(): Array<ExecuteCommandDto> {
    return this.commandQueue.phaseHistory();
  }
}
