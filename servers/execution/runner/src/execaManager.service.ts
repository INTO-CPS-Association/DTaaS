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
import { UpdatePhaseDto } from './dto/phase.dto.js';

const config: Config = readConfig();

export default class ExecaManager implements Manager {
  private phaseQueue: Queue = new Queue();

  async changePhase(name: string): Promise<[boolean, Map<string, string>]> {
    const phase: Command = {
      name,
      status: 'invalid',
      task: new ExecaRunner(''),
      // task attribute is deliberately left empty
    };

    let success: boolean = false;

    phase.task = new ExecaRunner(join(process.cwd(), config.location, name));
    this.phaseQueue.enqueue(phase);
    await phase.task.run().then((value) => {
      success = value;
      if (success) phase.status = 'valid';
    });
    return [success, phase.task.checkLogs()];
  }

  checkPhase(): CommandStatus {
    let commandStatus: CommandStatus;
    const logs: Map<string, string> = new Map<string, string>();
    const phase: Command | undefined = this.phaseQueue.activePhase();

    logs.set('stdout', '');
    logs.set('stderr', '');
    if (phase === undefined) {
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
        name: phase.name,
        status: phase.status,
        logs: {
          stdout: phase.task.checkLogs().get('stdout'),
          stderr: phase.task.checkLogs().get('stderr'),
        },
      };
      // console.log(phase.task.checkLogs());
    }
    return commandStatus;
  }

  checkHistory(): Array<UpdatePhaseDto> {
    return this.phaseQueue.phaseHistory();
  }
}
