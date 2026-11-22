import type {
  DTExecutionResult,
  DigitalTwin,
  DigitalTwinData,
} from '@into-cps-association/dt-automation';
import type {
  DigitalTwinDetails,
  DigitalTwinSummary,
} from '../interfaces/digital-twin.interface.js';
import type { ExecutionRecord } from '../interfaces/execution-record.interface.js';

export function toExecutionRecord(entry: DTExecutionResult): ExecutionRecord {
  return {
    id: entry.id,
    dtName: entry.dtName,
    pipelineId: entry.pipelineId,
    timestamp: entry.timestamp,
    status: entry.status,
    jobLogs: entry.jobLogs.map(({ jobName, log }) => ({ jobName, log })),
  };
}

export function toDigitalTwinSummary(
  data: DigitalTwinData,
): DigitalTwinSummary {
  return { name: data.DTName, description: data.description };
}

export function toDigitalTwinDetails(
  digitalTwin: DigitalTwin,
): DigitalTwinDetails {
  return {
    name: digitalTwin.DTName,
    description: digitalTwin.description ?? '',
    fullDescription: digitalTwin.fullDescription,
    descriptionFiles: digitalTwin.descriptionFiles,
    configFiles: digitalTwin.configFiles,
    lifecycleFiles: digitalTwin.lifecycleFiles,
  };
}
