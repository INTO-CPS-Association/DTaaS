import { jest } from '@jest/globals';
import { EMPTY, type Observable } from 'rxjs';
import type { IDigitalTwinsService } from 'src/digital-twins/interfaces/digital-twins.service.interface.js';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';

export function createFakeDigitalTwinsService(
  changes: Observable<ExecutionRecord> = EMPTY,
) {
  return {
    listDigitalTwins: jest.fn<IDigitalTwinsService['listDigitalTwins']>(),
    getDigitalTwin: jest.fn<IDigitalTwinsService['getDigitalTwin']>(),
    startExecution: jest.fn<IDigitalTwinsService['startExecution']>(),
    stopExecution: jest.fn<IDigitalTwinsService['stopExecution']>(),
    listExecutions: jest.fn<IDigitalTwinsService['listExecutions']>(),
    getExecution: jest.fn<IDigitalTwinsService['getExecution']>(),
    executionChanges: () => changes,
  } satisfies IDigitalTwinsService;
}

export type FakeDigitalTwinsService = ReturnType<
  typeof createFakeDigitalTwinsService
>;

export const execution: ExecutionRecord = {
  id: 'e-1',
  dtName: 'hello-world',
  pipelineId: 42,
  timestamp: 1700000000000,
  status: 'running',
  jobLogs: [],
};
