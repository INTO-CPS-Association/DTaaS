import { join } from 'path';
import { Injectable } from '@nestjs/common';
import {
  Command,
  Manager,
  CommandStatus,
} from './interfaces/command.interface.js';
import Queue from './queue.service.js';
import readConfig from './config/configuration.js';
import Config from './config/Config.interface.js';
import { ExecuteCommandDto } from './dto/command.dto.js';
import RunnerFactory from './runner-factory.service.js';

const config: Config = readConfig();

@Injectable()
export default class ExecaManager implements Manager {
  // eslint-disable-next-line no-useless-constructor
  constructor(private commandQueue: Queue, private runnerFactory: RunnerFactory) {} // eslint-disable-line no-empty-function

  async newCommand(name: string): Promise<[boolean, Map<string, string>]> {
    const command: Command = {
      name,
      status: 'invalid',
      task: this.runnerFactory.create(''),
      // task attribute is deliberately left empty
    };

    let success: boolean = false;

    command.task = this.runnerFactory.create(join(process.cwd(), config.location, name));
    this.commandQueue.enqueue(command);
    await command.task.run().then((value) => {
      success = value;
      if (success) command.status = 'valid';
    });
    return [success, command.task.checkLogs()];
  }

  checkStatus(): CommandStatus {
    let commandStatus: CommandStatus;
    const command: Command | undefined = this.commandQueue.activeCommand();

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
    return this.commandQueue.checkHistory();
  }
}
