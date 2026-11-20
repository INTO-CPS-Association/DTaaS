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
import { REQUEST_KEY } from '../dto/command.dto.js';
import {
  EventDto,
  eventSchema,
  fsmReply,
  FsmReplyDto,
  FsmStateDto,
  FSM_STATUS_CODES,
  TransitionDto,
  transitionSchema,
} from '../dto/fsm.dto.js';
import ZodValidationPipe, { validRequestKey } from '../validation.pipe.js';
import FsmService from './fsm.service.js';
import { AccessRoute } from '../auth/roles.js';

@Controller('fsm')
export default class FsmController {
  constructor(private readonly fsm: FsmService) {}

  @Get()
  @AccessRoute('fsm')
  check(@Res({ passthrough: true }) res: Response): FsmStateDto | FsmReplyDto {
    const state = this.fsm.check();
    if (state === undefined) {
      res.status(HttpStatus.NOT_FOUND);
      return fsmReply('no state machine', undefined);
    }
    return state;
  }

  @Post('transition')
  @AccessRoute('transition')
  transition(
    @Body(new ZodValidationPipe(transitionSchema)) { state }: TransitionDto,
    @Res({ passthrough: true }) res: Response,
    @Headers(REQUEST_KEY) requestKey?: string,
  ): FsmReplyDto {
    return FsmController.send(
      res,
      this.fsm.transition(state, validRequestKey(requestKey)),
    );
  }

  @Post('event')
  @AccessRoute('event')
  event(
    @Body(new ZodValidationPipe(eventSchema)) { event }: EventDto,
    @Res({ passthrough: true }) res: Response,
    @Headers(REQUEST_KEY) requestKey?: string,
  ): FsmReplyDto {
    return FsmController.send(
      res,
      this.fsm.event(event, validRequestKey(requestKey)),
    );
  }

  private static send(res: Response, reply: FsmReplyDto): FsmReplyDto {
    res.status(FSM_STATUS_CODES[reply.status]);
    return reply;
  }
}
