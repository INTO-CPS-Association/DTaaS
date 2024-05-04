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
import { CommandStatus } from './interfaces/command.interface.js';
import ExecaManager from './execa-manager.service.js';
import { ExecuteCommandDto, executeCommandSchema } from './dto/command.dto.js';
import ZodValidationPipe from './validation.pipe.js';

@Controller()
export default class AppController {
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly manager: ExecaManager) {} // eslint-disable-line no-empty-function

  @Get('history')
  getHistory(): Array<ExecuteCommandDto> {
    return this.manager.checkHistory();
  }

  @Post()
  @UsePipes(new ZodValidationPipe(executeCommandSchema))
  async newCommand(
    @Body() executeCommandDto: ExecuteCommandDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    let success = false;
    [success] = await this.manager.newCommand(executeCommandDto.name);
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
  async cmdStatus(): Promise<CommandStatus> {
    return this.manager.checkStatus();
  }
}
