import type { Observable } from 'rxjs';
import type { StartExecutionOptions } from '../dto/start-execution.dto.js';
import type {
  DigitalTwinDetails,
  DigitalTwinSummary,
} from './digital-twin.interface.js';
import type { ExecutionRecord } from './execution-record.interface.js';

/**
 * The operations that the REST API and the MQTT API call. Failures are
 * DigitalTwinErrors.
 */
export interface IDigitalTwinsService {
  listDigitalTwins(): Promise<DigitalTwinSummary[]>;
  getDigitalTwin(dtName: string): Promise<DigitalTwinDetails>;
  startExecution(
    dtName: string,
    options?: StartExecutionOptions,
  ): Promise<ExecutionRecord>;
  stopExecution(dtName: string, executionId: string): Promise<ExecutionRecord>;
  listExecutions(dtName: string): Promise<ExecutionRecord[]>;
  getExecution(dtName: string, executionId: string): Promise<ExecutionRecord>;
  executionChanges(): Observable<ExecutionRecord>;
}

export const DIGITAL_TWINS_SERVICE = Symbol('DIGITAL_TWINS_SERVICE');
