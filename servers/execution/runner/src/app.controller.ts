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
import {
  ExecuteCommandDto,
  executeCommandSchema,
  executeResponse,
} from './dto/command.dto.js';
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
    res
      .status(success ? HttpStatus.OK : HttpStatus.BAD_REQUEST)
      .send(executeResponse(success));
  }

  @Get()
  async cmdStatus(): Promise<CommandStatus> {
    return this.manager.checkStatus();
  }
}
