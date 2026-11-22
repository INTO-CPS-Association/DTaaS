import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { type Observable, Subject } from 'rxjs';
import type DtAutomationFacade from 'src/digital-twins/dt-automation/dt-automation-facade.js';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';

type Facade = DtAutomationFacade;

/** Keeps the digital twins and their executions in memory. */
export default class FakeDtAutomationFacade {
  readonly digitalTwins = new Map([['hello-world', 'Says hello']]);

  readonly executions = new Map<string, ExecutionRecord>();

  readonly changes = new Subject<ExecutionRecord>();

  readonly listDigitalTwins = jest.fn<Facade['listDigitalTwins']>(async () =>
    [...this.digitalTwins].map(([name, description]) => ({
      name,
      description,
    })),
  );

  readonly getDigitalTwin = jest.fn<Facade['getDigitalTwin']>(
    async (dtName) => ({
      name: dtName,
      description: this.digitalTwins.get(dtName) ?? '',
      fullDescription: `# ${dtName}`,
      descriptionFiles: ['description.md', 'README.md'],
      configFiles: ['config.json'],
      lifecycleFiles: ['execute', 'terminate'],
    }),
  );

  readonly startExecution = jest.fn<Facade['startExecution']>(async (dtName) =>
    this.record({
      id: randomUUID(),
      dtName,
      pipelineId: 42,
      timestamp: Date.now(),
      status: 'running',
      jobLogs: [],
    }),
  );

  readonly stopExecution = jest.fn<Facade['stopExecution']>(
    async (_dtName, executionId) =>
      this.record({ ...this.stored(executionId), status: 'canceled' }),
  );

  readonly listExecutions = jest.fn<Facade['listExecutions']>(async (dtName) =>
    [...this.executions.values()].filter(
      (execution) => execution.dtName === dtName,
    ),
  );

  readonly findExecution = jest.fn<Facade['findExecution']>(
    async (executionId) => this.executions.get(executionId) ?? null,
  );

  executionChanges(): Observable<ExecutionRecord> {
    return this.changes.asObservable();
  }

  record(execution: ExecutionRecord): ExecutionRecord {
    this.executions.set(execution.id, execution);
    return execution;
  }

  private stored(executionId: string): ExecutionRecord {
    const execution = this.executions.get(executionId);
    if (execution === undefined) {
      throw new Error(`FakeDtAutomationFacade has no execution ${executionId}`);
    }
    return execution;
  }
}
