import { Controller, Get } from '@nestjs/common';
// import { AppService } from './app.service';
import Queue from './queue.service';
import { Phase } from './interfaces/lifecycle.interface';
import ExecaCMDRunner from './execaCMDRunner';
import LifeCycleManager from './lifecycleManager.service';

@Controller()
export default class AppController {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly lifecycle: LifeCycleManager,
    private readonly queueService: Queue,
  ) {} // eslint-disable-line no-empty-function

  @Get('phase')
  getHello(): string[] {
    const phase: Phase = {
      name: 'hello',
      status: 'valid',
      task: new ExecaCMDRunner(''),
    };
    this.queueService.enqueue(phase);
    return this.queueService.phaseHistory();
  }

  @Get('lifecycle/phase')
  async changePhase(): Promise<boolean> {
    let success = false;

    [success] = await this.lifecycle.changePhase('date');

    return success;
  }
}
