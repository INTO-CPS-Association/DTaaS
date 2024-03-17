import { join } from 'path';
import { Phase, DTLifeCycle } from './interfaces/lifecycle.interface.js';
import ExecaCMDRunner from './execaCMDRunner.js';
import Queue from './queue.service.js';
import readConfig from './config/configuration.js';
import Config from './config/Config.interface.js';

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

  checkPhase(): Phase | undefined {
    return this.phaseQueue.activePhase();
  }

  checkHistory(): Array<string> {
    return this.phaseQueue.phaseHistory();
  }
}
