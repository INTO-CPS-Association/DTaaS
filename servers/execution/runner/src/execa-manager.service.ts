import { join } from 'path';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
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

// A command run in progress, and its row in the queue
type Run = { id: number; result: Promise<CommandResult> };

@Injectable()
export default class ExecaManager implements Manager, OnApplicationShutdown {
  private readonly logger = new Logger(ExecaManager.name);

  // the runs in progress, by command name
  private readonly running = new Map<string, Run>();

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly commandQueue: Queue,
    private readonly config: Config,
  ) {} // eslint-disable-line no-empty-function

  // A repeated request is not run again; it gets the result of the
  // request it repeats
  async newCommand(name: string, key?: string): Promise<CommandResult> {
    // an empty key marks no request
    const requestKey = key === '' ? undefined : key;
    const earlier =
      requestKey === undefined
        ? undefined
        : this.commandQueue.findByKey(requestKey);
    if (earlier !== undefined) {
      return this.repeat(name, earlier);
    }
    const current = this.running.get(name);
    if (current === undefined) {
      return this.start(name, requestKey);
    }
    // keep the key, so that a retry of this request is a repeat too
    if (requestKey !== undefined) {
      this.commandQueue.addKey(requestKey, current.id);
    }
    this.logger.log(
      `Joined a request for ${JSON.stringify(name)} to its running command`,
    );
    return current.result;
  }

  // The stored result, or the run in progress, of the request whose key
  // the new request repeats; a key of another command is refused
  private async repeat(
    name: string,
    earlier: CommandRecord,
  ): Promise<CommandResult> {
    if (earlier.name !== name) {
      this.logger.warn(
        `Refused ${JSON.stringify(name)}: its request key is of ${earlier.name}`,
      );
      return [false, new Map<string, string>()];
    }
    this.logger.log(`Discarded a repeated request for ${JSON.stringify(name)}`);
    const current = this.running.get(name);
    if (current?.id === earlier.id) {
      return current.result;
    }
    return storedResult(earlier);
  }

  private async start(
    name: string,
    requestKey?: string,
  ): Promise<CommandResult> {
    const id = this.commandQueue.enqueue(name, requestKey);
    const result = this.execute(id, name);
    this.running.set(name, { id, result });
    try {
      return await result;
    } finally {
      this.running.delete(name);
    }
  }

  private async execute(id: number, name: string): Promise<CommandResult> {
    let result: CommandResult = [false, new Map<string, string>()];
    if (this.config.permitCommands().includes(name)) {
      const task = RunnerFactory.create(join(this.config.getLocation(), name));
      result = [await task.run(), task.checkLogs()];
    }
    this.commandQueue.complete(id, result);
    return result;
  }

  // Lets the runs in progress finish, as their results go to the
  // database, which closes after them
  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(
      [...this.running.values()].map(({ result }) => result),
    );
    this.commandQueue.close();
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
