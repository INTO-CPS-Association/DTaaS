import type DigitalTwin from 'model/backend/digitalTwin';
import { ExecutionStatus, JobLog } from 'model/backend/interfaces/execution';
import indexedDBService from 'database/executionHistoryDB';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';

export async function getExecutionHistoryFn(
  self: DigitalTwin,
): Promise<DTExecutionResult[]> {
  return indexedDBService.getByDTName(self.DTName);
}

export async function getExecutionHistoryByIdFn(
  self: DigitalTwin,
  executionId: string,
): Promise<DTExecutionResult | undefined> {
  const result = await indexedDBService.getById(executionId);
  return result || undefined;
}

export async function updateExecutionLogsFn(
  self: DigitalTwin,
  executionId: string,
  jobLogs: JobLog[],
): Promise<void> {
  const execution = await indexedDBService.getById(executionId);
  if (execution) {
    execution.jobLogs = jobLogs;
    await indexedDBService.update(execution);

    if (executionId === self.currentExecutionId) {
      self.jobLogs = jobLogs;
    }
  }
}

export async function updateExecutionStatusFn(
  self: DigitalTwin,
  executionId: string,
  status: ExecutionStatus,
): Promise<void> {
  const execution = await indexedDBService.getById(executionId);
  if (execution) {
    execution.status = status;
    await indexedDBService.update(execution);

    if (executionId === self.currentExecutionId) {
      self.lastExecutionStatus = status;
    }
  }
}
