import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import {
  CommandRecord,
  CommandResult,
  CommandStatus,
  Manager,
} from './interfaces/command.interface.js';
import Queue from './queue.service.js';
import { ExecuteCommandDto } from './dto/command.dto.js';
import RunnerFactory from './runner-factory.service.js';
import Config from './config/configuration.service.js';

const storedResult = (command: CommandRecord): CommandResult => [
  command.status === 'valid',
  new Map([
    ['stdout', command.stdout],
    ['stderr', command.stderr],
  ]),
];

@Injectable()
export default class ExecaManager implements Manager {
  private readonly logger = new Logger(ExecaManager.name);

  // the runs in progress, by command name
  private readonly running = new Map<string, Promise<CommandResult>>();

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private commandQueue: Queue,
    private config: Config,
  ) {} // eslint-disable-line no-empty-function

  // A repeated request is not run again; it gets the result of the
  // request it repeats
  async newCommand(name: string, key?: string): Promise<CommandResult> {
    // an empty key marks no request
    const requestKey = key === '' ? undefined : key;
    const repeated = this.repeatedRun(name, requestKey);
    if (repeated !== undefined) {
      this.logger.log(`Discarded a repeated request for ${name}`);
      return repeated;
    }
    const run = this.run(name, requestKey);
    this.running.set(name, run);
    try {
      return await run;
    } finally {
      this.running.delete(name);
    }
  }

  // A request repeats an earlier one with the same request key, or else
  // a run of the same command that has not finished yet
  private repeatedRun(
    name: string,
    requestKey: string | undefined,
  ): Promise<CommandResult> | undefined {
    const earlier =
      requestKey === undefined
        ? undefined
        : this.commandQueue.findByKey(requestKey);
    if (earlier === undefined) {
      return this.running.get(name);
    }
    const unfinished = earlier.finished
      ? undefined
      : this.running.get(earlier.name);
    return unfinished ?? Promise.resolve(storedResult(earlier));
  }

  private async run(name: string, requestKey?: string): Promise<CommandResult> {
    const id = this.commandQueue.enqueue(name, requestKey);
    let result: CommandResult = [false, new Map<string, string>()];
    if (this.config.permitCommands().includes(name)) {
      const task = RunnerFactory.create(join(this.config.getLocation(), name));
      result = [await task.run(), task.checkLogs()];
    }
    this.commandQueue.complete(id, result);
    return result;
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
    const command = this.commandQueue.activeCommand();
    if (command === undefined) {
      return ExecaManager.createStatus('none', 'invalid');
    }
    return {
      name: command.name,
      status: command.status,
      logs: { stdout: command.stdout, stderr: command.stderr },
    };
  }

  checkHistory(): Array<ExecuteCommandDto> {
    return this.commandQueue.checkHistory();
  }
}
