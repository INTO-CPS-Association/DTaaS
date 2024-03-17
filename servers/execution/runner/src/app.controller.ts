import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import Queue from './queue.service.js';
import { Phase, PhaseStatus } from './interfaces/lifecycle.interface.js';
import ExecaCMDRunner from './execaCMDRunner.js';
import LifeCycleManager from './lifecycleManager.service.js';
import UpdatePhaseDto from './dto/phase.dto.js';

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

  @Post('lifecycle/phase')
  async changePhase(
    @Body() updatePhaseDto: UpdatePhaseDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    let success = false;
    [success] = await this.lifecycle.changePhase(updatePhaseDto.name);
    if (success) {
      res.status(HttpStatus.OK).send({
        status: 'success',
      });
    } else {
      res.status(HttpStatus.BAD_REQUEST).send({
        status: 'invalid phase',
      });
    }
  }

  @Get('lifecycle/phase')
  async reportPhase(): Promise<any> {
    const phaseStatus: PhaseStatus = this.lifecycle.checkPhase();
    return {
      name: phaseStatus.name,
      status: phaseStatus.status,
      logs: {
        stdout: phaseStatus.logs.get('stdout'),
        stderr: phaseStatus.logs.get('stderr'),
      },
    };
    // return this.lifecycle.checkPhase();
  }
  /*
  @Get('lifecycle/phase')
  async reportPhase(): Promise<PhaseStatus> {
    return this.lifecycle.checkPhase();
  }
  */
}
