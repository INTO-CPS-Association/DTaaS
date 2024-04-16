import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Res,
  UsePipes,
} from '@nestjs/common';
import { Response } from 'express';
import { CommandStatus } from './interfaces/lifecycle.interface.js';
import LifeCycleManager from './lifecycleManager.service.js';
import { UpdatePhaseDto, updatePhaseSchema } from './dto/phase.dto.js';
import ZodValidationPipe from './validation.pipe.js';

@Controller()
export default class AppController {
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly lifecycle: LifeCycleManager) {} // eslint-disable-line no-empty-function

  @Get('history')
  getHello(): Array<UpdatePhaseDto> {
    return this.lifecycle.checkHistory();
  }

  @Post()
  @UsePipes(new ZodValidationPipe(updatePhaseSchema))
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
        status: 'invalid command',
      });
    }
  }

  @Get()
  async reportPhase(): Promise<CommandStatus> {
    return this.lifecycle.checkPhase();
  }
}
