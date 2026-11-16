import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Put,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { fsmReply, FsmReplyDto } from './dto/fsm.dto.js';
import {
  ParametersBody,
  parametersBodySchema,
  ParametersDto,
} from './dto/parameters.dto.js';
import FsmService from './fsm/fsm.service.js';
import ZodValidationPipe from './validation.pipe.js';
import { AccessRoute } from './auth/roles.js';

@Controller('parameters')
export default class ParametersController {
  constructor(private readonly fsm: FsmService) {}

  // Without a state machine, the reply of GET /fsm
  @Get()
  @AccessRoute('parameters')
  get(@Res({ passthrough: true }) res: Response): ParametersDto | FsmReplyDto {
    const document = this.fsm.parameters()?.document();
    if (document === undefined) {
      res.status(HttpStatus.NOT_FOUND);
      return fsmReply('no state machine', undefined);
    }
    return document;
  }

  // The route is idempotent, so it takes no request key
  @Put()
  @AccessRoute('set-parameters')
  set(
    @Body(new ZodValidationPipe(parametersBodySchema)) body: ParametersBody,
    @Res({ passthrough: true }) res: Response,
  ): ParametersDto | FsmReplyDto {
    const problems = this.fsm.setParameters(body);
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }
    return this.get(res);
  }
}
