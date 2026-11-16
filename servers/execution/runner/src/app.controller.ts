import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CommandStatus } from './interfaces/command.interface.js';
import ExecaManager from './execa-manager.service.js';
import DescriptorService from './descriptor.service.js';
import { DescriptorDto } from './dto/descriptor.dto.js';
import {
  EscalateBody,
  EscalateReplyDto,
  escalateSchema,
} from './dto/escalation.dto.js';
import {
  HistoryEntryDto,
  HistoryQuery,
  historyQuerySchema,
} from './dto/history.dto.js';
import { MetricsDto } from './dto/metrics.dto.js';
import { StateDocumentDto } from './dto/state.dto.js';
import {
  EXECUTE_STATUS_CODES,
  ExecuteCommandDto,
  executeCommandSchema,
  executeReply,
  REQUEST_KEY,
  runOptions,
  StopDto,
  stopSchema,
  StopResponseDto,
} from './dto/command.dto.js';
import ZodValidationPipe, { validRequestKey } from './validation.pipe.js';
import FsmService from './fsm/fsm.service.js';
import { AccessRoute } from './auth/roles.js';
import { Caller, CallerInfo } from './auth/caller.js';

@Controller()
export default class AppController {
  constructor(
    private readonly manager: ExecaManager,
    private readonly descriptor: DescriptorService,
    private readonly fsm: FsmService,
  ) {}

  @Get('dt')
  @AccessRoute('dt')
  describe(): DescriptorDto {
    return this.descriptor.describe();
  }

  @Get('state')
  @AccessRoute('state')
  state(): StateDocumentDto {
    return this.descriptor.state();
  }

  @Get('metrics')
  @AccessRoute('metrics')
  metrics(): MetricsDto {
    return this.descriptor.metrics();
  }

  @Get('history')
  @AccessRoute('history')
  getHistory(
    @Query(new ZodValidationPipe(historyQuerySchema)) query: HistoryQuery,
  ): HistoryEntryDto[] {
    return this.manager.checkHistory(query);
  }

  @Post()
  @AccessRoute('execute')
  async newCommand(
    @Body(new ZodValidationPipe(executeCommandSchema))
    executeCommandDto: ExecuteCommandDto,
    @Res({ passthrough: true }) res: Response,
    @Caller() { requestKey, by }: CallerInfo,
  ): Promise<void> {
    const { name } = executeCommandDto;
    const env = this.fsm.environment(name);
    const reply = await executeReply(
      this.manager.newCommand(
        name,
        requestKey,
        runOptions(executeCommandDto, env, by),
      ),
    );
    res.status(EXECUTE_STATUS_CODES[reply.status]).send(reply);
  }

  // Answers once the stopped scripts have exited
  @Post('stop')
  @AccessRoute('stop')
  @HttpCode(HttpStatus.OK)
  async stop(
    @Body(new ZodValidationPipe(stopSchema)) { name }: StopDto,
  ): Promise<StopResponseDto> {
    return { stopped: await this.manager.stop(name) };
  }

  // Accepted with or without a state machine
  @Post('escalate')
  @AccessRoute('escalate')
  @HttpCode(HttpStatus.ACCEPTED)
  escalate(
    @Body(new ZodValidationPipe(escalateSchema)) body: EscalateBody,
    @Headers(REQUEST_KEY) requestKey?: string,
  ): EscalateReplyDto {
    return this.fsm.escalate(body, validRequestKey(requestKey));
  }

  @Get()
  @AccessRoute('status')
  async cmdStatus(): Promise<CommandStatus> {
    return this.manager.checkStatus();
  }
}
