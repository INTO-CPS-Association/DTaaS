import { Inject, Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  DigitalTwinNotFoundError,
  ExecutionNotFoundError,
} from './digital-twins.errors.js';
import DtAutomationFacade from './dt-automation/dt-automation-facade.js';
import type { StartExecutionOptions } from './dto/start-execution.dto.js';
import type {
  DigitalTwinDetails,
  DigitalTwinSummary,
} from './interfaces/digital-twin.interface.js';
import type { IDigitalTwinsService } from './interfaces/digital-twins.service.interface.js';
import type { ExecutionRecord } from './interfaces/execution-record.interface.js';

// A finished execution has nothing left to stop, so stopping returns it as it
// is. An execution in error has only lost its status check and may still run.
const FINISHED_STATUSES = new Set(['completed', 'failed', 'canceled']);

@Injectable()
export default class DigitalTwinsService implements IDigitalTwinsService {
  private digitalTwins = new Map<string, DigitalTwinSummary>();

  private refreshing: Promise<void> | undefined;

  constructor(
    @Inject(DtAutomationFacade)
    private readonly dtAutomation: DtAutomationFacade,
  ) {}

  executionChanges(): Observable<ExecutionRecord> {
    return this.dtAutomation.executionChanges();
  }

  async listDigitalTwins(): Promise<DigitalTwinSummary[]> {
    await this.refreshDigitalTwins();
    return [...this.digitalTwins.values()];
  }

  async getDigitalTwin(dtName: string): Promise<DigitalTwinDetails> {
    await this.requireDigitalTwin(dtName);
    return this.dtAutomation.getDigitalTwin(dtName);
  }

  async startExecution(
    dtName: string,
    options: StartExecutionOptions = {},
  ): Promise<ExecutionRecord> {
    await this.requireDigitalTwin(dtName);
    return this.dtAutomation.startExecution(dtName, options);
  }

  async stopExecution(
    dtName: string,
    executionId: string,
  ): Promise<ExecutionRecord> {
    const execution = await this.getExecution(dtName, executionId);
    if (FINISHED_STATUSES.has(execution.status)) return execution;
    return this.dtAutomation.stopExecution(dtName, executionId);
  }

  async listExecutions(dtName: string): Promise<ExecutionRecord[]> {
    await this.requireDigitalTwin(dtName);
    const executions = await this.dtAutomation.listExecutions(dtName);
    return executions.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getExecution(
    dtName: string,
    executionId: string,
  ): Promise<ExecutionRecord> {
    await this.requireDigitalTwin(dtName);
    const execution = await this.dtAutomation.findExecution(executionId);
    if (execution?.dtName !== dtName) {
      throw new ExecutionNotFoundError(dtName, executionId);
    }
    return execution;
  }

  private async requireDigitalTwin(dtName: string): Promise<void> {
    if (!this.digitalTwins.has(dtName)) await this.refreshDigitalTwins();
    if (!this.digitalTwins.has(dtName)) {
      throw new DigitalTwinNotFoundError(dtName);
    }
  }

  private refreshDigitalTwins(): Promise<void> {
    this.refreshing ??= this.loadDigitalTwins().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  private async loadDigitalTwins(): Promise<void> {
    const digitalTwins = await this.dtAutomation.listDigitalTwins();
    this.digitalTwins = new Map(
      digitalTwins.map((digitalTwin) => [digitalTwin.name, digitalTwin]),
    );
  }
}
