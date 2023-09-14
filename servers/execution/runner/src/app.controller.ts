import { Controller, Get } from '@nestjs/common';
// import { AppService } from './app.service';
import Queue from './queue.service';
import { Phase } from './interfaces/lifecycle.interface';

@Controller()
export default class AppController {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    // private readonly appService: AppService,
    private readonly queueService: Queue,
  ) {}  // eslint-disable-line no-empty-function

  @Get()
  getHello(): string[] {
    const phase: Phase = {
      name: 'hello',
      status: 'valid',
    };
    this.queueService.enqueue(phase);
    return this.queueService.phaseHistory();
  }
}
