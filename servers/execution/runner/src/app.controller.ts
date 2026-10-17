import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CommandStatus } from './interfaces/command.interface.js';
import ExecaManager from './execa-manager.service.js';
import {
  ExecuteCommandDto,
  executeCommandSchema,
  executeResponse,
  REQUEST_KEY,
  requestKeySchema,
} from './dto/command.dto.js';
import ZodValidationPipe, { validationFailed } from './validation.pipe.js';

@Controller()
export default class AppController {
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly manager: ExecaManager) {} // eslint-disable-line no-empty-function

  @Get('history')
  getHistory(): Array<ExecuteCommandDto> {
    return this.manager.checkHistory();
  }

  @Post()
  async newCommand(
    @Body(new ZodValidationPipe(executeCommandSchema))
    executeCommandDto: ExecuteCommandDto,
    @Res({ passthrough: true }) res: Response,
    @Headers(REQUEST_KEY) requestKey?: string,
  ): Promise<void> {
    if (!requestKeySchema.safeParse(requestKey).success) {
      throw validationFailed();
    }
    const [success] = await this.manager.newCommand(
      executeCommandDto.name,
      requestKey,
    );
    res
      .status(success ? HttpStatus.OK : HttpStatus.BAD_REQUEST)
      .send(executeResponse(success));
  }

  @Get()
  async cmdStatus(): Promise<CommandStatus> {
    return this.manager.checkStatus();
  }
}
