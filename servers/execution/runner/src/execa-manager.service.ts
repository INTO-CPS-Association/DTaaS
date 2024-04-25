import { join } from 'path';
import { Injectable } from '@nestjs/common';
import {
  Command,
  Manager,
  CommandStatus,
} from './interfaces/command.interface.js';
import Queue from './queue.service.js';
import { ExecuteCommandDto } from './dto/command.dto.js';
import RunnerFactory from './runner-factory.service.js';
import Config from './config/configuration.service.js';

@Injectable()
export default class ExecaManager implements Manager {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private commandQueue: Queue,
    private config: Config,
  ) {} // eslint-disable-line no-empty-function

  async newCommand(name: string): Promise<[boolean, Map<string, string>]> {
    let success: boolean = false;
    const command: Command = {
      name,
      status: 'invalid',
      task: RunnerFactory.create(
        join(process.cwd(), this.config.getLocation(), name),
      ),
    };
    this.commandQueue.enqueue(command);
    await this.config.loadConfig();
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
    }
    return commandStatus;
  }

  checkHistory(): Array<ExecuteCommandDto> {
    return this.commandQueue.checkHistory();
  }
}
