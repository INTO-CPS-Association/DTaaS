import { join } from 'path';
import {
  Phase,
  DTLifeCycle,
  PhaseStatus,
} from './interfaces/lifecycle.interface.js';
import ExecaCMDRunner from './execaCMDRunner.js';
import Queue from './queue.service.js';
import readConfig from './config/configuration.js';
import Config from './config/Config.interface.js';
import { UpdatePhaseDto } from './dto/phase.dto.js';

const config: Config = readConfig();

export default class LifeCycleManager implements DTLifeCycle {
  private phaseQueue: Queue = new Queue();

  async changePhase(name: string): Promise<[boolean, Map<string, string>]> {
    const phase: Phase = {
      name,
      status: 'invalid',
      task: new ExecaCMDRunner(''),
      // task attribute is deliberately left empty
    };

    let success: boolean = false;

    phase.task = new ExecaCMDRunner(join(process.cwd(), config.location, name));
    this.phaseQueue.enqueue(phase);
    await phase.task.run().then((value) => {
      success = value;
      if (success) phase.status = 'valid';
    });
    return [success, phase.task.checkLogs()];
  }

  checkPhase(): PhaseStatus {
    let phaseStatus: PhaseStatus;
    const logs: Map<string, string> = new Map<string, string>();
    const phase: Phase | undefined = this.phaseQueue.activePhase();

    logs.set('stdout', '');
    logs.set('stderr', '');
    if (phase === undefined) {
      phaseStatus = {
        name: 'none',
        status: 'invalid',
        logs: {
          stdout: '',
          stderr: '',
        },
      };
    } else {
      phaseStatus = {
        name: phase.name,
        status: phase.status,
        logs: {
          stdout: phase.task.checkLogs().get('stdout'),
          stderr: phase.task.checkLogs().get('stderr'),
        },
      };
      // console.log(phase.task.checkLogs());
    }
    return phaseStatus;
  }

  checkHistory(): Array<UpdatePhaseDto> {
    return this.phaseQueue.phaseHistory();
  }
}
