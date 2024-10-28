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
    let logs: Map<string, string> = new Map<string, string>();
    let status: boolean = false;
    const command: Command = {
      name,
      status: 'invalid',
      task: undefined,
    };
    this.commandQueue.enqueue(command);

    if (this.config.permitCommands().includes(name)) {
      command.task = RunnerFactory.create(
        join(this.config.getLocation(), name),
      );
      await command.task.run().then((value) => {
        status = value;
        if (value) {
          command.status = 'valid';
        }

        if (command.task !== undefined) {
          logs = command.task.checkLogs();
        }
      });
    }
    return [status, logs];
  }

  private static createStatus(name: string, status: string) {
    return {
      name,
      status,
      logs: {
        stdout: '',
        stderr: '',
      },
    };
  }

  checkStatus(): CommandStatus {
    let commandStatus: CommandStatus = ExecaManager.createStatus(
      'none',
      'invalid',
    );
    const command: Command | undefined = this.commandQueue.activeCommand();

    if (command !== undefined && command.task === undefined) {
      commandStatus = ExecaManager.createStatus(command.name, command.status);
    }
    if (command !== undefined && command.task !== undefined) {
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
