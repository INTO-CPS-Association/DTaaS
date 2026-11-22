import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseFilters,
} from '@nestjs/common';
import DigitalTwinsErrorsFilter from './digital-twins-errors.filter.js';
import { dtNameSchema } from './dto/digital-twin-name.dto.js';
import { executionIdSchema } from './dto/execution-id.dto.js';
import {
  type StartExecutionOptions,
  startExecutionOptionsSchema,
} from './dto/start-execution.dto.js';
import type {
  DigitalTwinDetails,
  DigitalTwinSummary,
} from './interfaces/digital-twin.interface.js';
import {
  DIGITAL_TWINS_SERVICE,
  type IDigitalTwinsService,
} from './interfaces/digital-twins.service.interface.js';
import type { ExecutionRecord } from './interfaces/execution-record.interface.js';
import ZodValidationPipe from './validation.pipe.js';

// A start request may come without a body.
const startBodySchema = startExecutionOptionsSchema.default({});

const DtName = () => Param('name', new ZodValidationPipe(dtNameSchema));
const ExecutionId = () => Param('id', new ZodValidationPipe(executionIdSchema));
const StartOptions = () => Body(new ZodValidationPipe(startBodySchema));

@Controller('digital-twins')
@UseFilters(DigitalTwinsErrorsFilter)
export default class DigitalTwinsController {
  constructor(
    @Inject(DIGITAL_TWINS_SERVICE)
    private readonly digitalTwins: IDigitalTwinsService,
  ) {}

  @Get()
  list(): Promise<DigitalTwinSummary[]> {
    return this.digitalTwins.listDigitalTwins();
  }

  @Get(':name')
  get(@DtName() name: string): Promise<DigitalTwinDetails> {
    return this.digitalTwins.getDigitalTwin(name);
  }

  @Post(':name/executions')
  @HttpCode(HttpStatus.ACCEPTED)
  start(
    @DtName() name: string,
    @StartOptions() options: StartExecutionOptions,
  ): Promise<ExecutionRecord> {
    return this.digitalTwins.startExecution(name, options);
  }

  @Get(':name/executions')
  listExecutions(@DtName() name: string): Promise<ExecutionRecord[]> {
    return this.digitalTwins.listExecutions(name);
  }

  @Get(':name/executions/:id')
  getExecution(
    @DtName() name: string,
    @ExecutionId() id: string,
  ): Promise<ExecutionRecord> {
    return this.digitalTwins.getExecution(name, id);
  }

  @Post(':name/executions/:id/stop')
  @HttpCode(HttpStatus.OK)
  stop(
    @DtName() name: string,
    @ExecutionId() id: string,
  ): Promise<ExecutionRecord> {
    return this.digitalTwins.stopExecution(name, id);
  }
}
