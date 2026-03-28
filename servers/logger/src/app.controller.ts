import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UsePipes,
  HttpCode,
} from '@nestjs/common';
import LogsService from './logs/logs.service.js';
import { LogEventDto } from './dto/log-event.dto.js';
import LogEventValidationPipe from './log-event-validation.pipe.js';

type HealthResponse = {
  status: 'ok';
};

@Controller('logger')
export default class AppController {
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly logsService: LogsService) {} // eslint-disable-line no-empty-function

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health(): HealthResponse {
    return { status: 'ok' };
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(LogEventValidationPipe)
  async ingestEvent(@Body() logEventDto: LogEventDto): Promise<void> {
    await this.logsService.appendEvent(logEventDto);
  }
}
