import { join } from 'path';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  CommandOptions,
  CommandRecord,
  CommandResult,
  CommandStatus,
  Manager,
} from './interfaces/command.interface.js';
import { refuseInput, storedResult } from './command-result.js';
import Queue from './queue.service.js';
import { CommandRefused } from './dto/command.dto.js';
import {
  HistoryEntryDto,
  HistoryQuery,
  historyQuerySchema,
} from './dto/history.dto.js';
import {
  DatabaseMode,
  ScriptsHealth,
  scriptsHealth,
} from './dto/health.dto.js';
import RunnerFactory from './runner-factory.service.js';
import Config from './config/configuration.service.js';
import Runner, { RunOptions } from './interfaces/runner.interface.js';
import { NO_RESOURCES } from './resources/resources.js';

// A command run in progress, its row in the queue, and its runner; a
// command that is not permitted has no runner
type Run = { id: number; result: Promise<CommandResult>; runner?: Runner };

type StoppableRun = [string, Run & { runner: Runner }];

@Injectable()
export default class ExecaManager implements Manager, OnApplicationShutdown {
  private readonly logger = new Logger(ExecaManager.name);

  // the runs in progress, by command name
  private readonly running = new Map<string, Run>();

  constructor(
    private readonly commandQueue: Queue,
    private readonly config: Config,
  ) {}

  // A repeated request is not run again; it gets the result of the
  // request it repeats, and neither passes its options to a script.
  // A refused request rejects with CommandRefused.
  async newCommand(
    name: string,
    key?: string,
    options?: CommandOptions,
  ): Promise<CommandResult> {
    // an empty key marks no request
    const requestKey = key === '' ? undefined : key;
    const earlier = this.earlierRequest(requestKey);
    if (earlier !== undefined) {
      return this.repeat(name, earlier);
    }
    const current = this.running.get(name);
    if (current === undefined) {
      return this.start(name, requestKey, options);
    }
    refuseInput(options);
    return this.join(name, current, requestKey);
  }

  private earlierRequest(requestKey?: string): CommandRecord | undefined {
    return requestKey === undefined
      ? undefined
      : this.commandQueue.findByKey(requestKey);
  }

  private join(
    name: string,
    current: Run,
    requestKey?: string,
  ): Promise<CommandResult> {
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
      throw new CommandRefused('invalid command');
    }
    this.logger.log(`Discarded a repeated request for ${JSON.stringify(name)}`);
    const current = this.running.get(name);
    if (current?.id === earlier.id) {
      return current.result;
    }
    return storedResult(earlier);
  }

  private start(
    name: string,
    requestKey?: string,
    options?: CommandOptions,
  ): Promise<CommandResult> {
    const id = this.commandQueue.enqueue(name, requestKey, options?.by);
    const runner = this.createRunner(name);
    const result = this.finish(name, this.execute(id, runner, options));
    this.running.set(name, { id, result, runner });
    return result;
  }

  private createRunner(name: string): Runner | undefined {
    if (!this.config.permitCommands().includes(name)) {
      return undefined;
    }
    return RunnerFactory.create(join(this.config.getLocation(), name), {
      stopGrace: this.config.getStopGrace(),
      user: this.config.getScriptUser(),
    });
  }

  // The run leaves the running ones once its result is stored
  private async finish(
    name: string,
    execution: Promise<CommandResult>,
  ): Promise<CommandResult> {
    try {
      return await execution;
    } finally {
      this.running.delete(name);
    }
  }

  // A refused run rejects to the requests that await it, and stop and
  // shutdown settle it
  private async execute(
    id: number,
    runner?: Runner,
    options?: RunOptions,
  ): Promise<CommandResult> {
    if (runner === undefined) {
      this.commandQueue.refuse(id);
      throw new CommandRefused('invalid command');
    }
    const outcome = await runner.run(options);
    const result: CommandResult = [
      outcome,
      runner.checkLogs(),
      runner.checkExitCode(),
      runner.checkResources(),
    ];
    this.commandQueue.complete(id, result);
    return result;
  }

  // Stops the run of the named command, or every run, and resolves with
  // their names once they have finished, so that a new request for one
  // of them starts the command afresh
  async stop(name?: string): Promise<string[]> {
    const runs = this.stoppable(name);
    runs.forEach(([, { runner }]) => void runner.stop());
    await Promise.allSettled(runs.map(([, { result }]) => result));
    return runs.map(([command]) => command);
  }

  // The runs of the named command, or all of them, that have a runner
  private stoppable(name?: string): StoppableRun[] {
    return [...this.running].filter(
      (run): run is StoppableRun =>
        run[1].runner !== undefined && (name === undefined || name === run[0]),
    );
  }

  // Lets the runs in progress finish, as their results go to the
  // database, which closes after them. FsmService stores the status of a
  // script a few microtasks after its run settles, so the database closes
  // only after the next turn of the event loop; nothing between a run
  // settling and that write may await I/O.
  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(
      [...this.running.values()].map(({ result }) => result),
    );
    await new Promise(setImmediate);
    this.commandQueue.close();
  }

  isRunning(name: string): boolean {
    return this.running.has(name);
  }

  private static createStatus(name: string, status: string) {
    return {
      name,
      status,
      logs: {
        stdout: '',
        stderr: '',
      },
      exitCode: null,
      resources: NO_RESOURCES,
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
      exitCode: command.exitCode,
      resources: command.resources,
    };
  }

  // Without a query, the defaults of GET /history
  checkHistory(
    query: HistoryQuery = historyQuerySchema.parse({}),
  ): HistoryEntryDto[] {
    return this.commandQueue.history(query);
  }

  databaseMode(): DatabaseMode {
    return this.commandQueue.mode();
  }

  scriptsHealth(): ScriptsHealth {
    return scriptsHealth(this.config.getScriptUser());
  }
}
