import type DigitalTwin from 'model/backend/digitalTwin';
import { ExecutionStatus, JobLog } from 'model/backend/interfaces/execution';
import type { IExecutionHistory } from 'model/backend/interfaces/execution';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';

let dbService: IExecutionHistory | null = null;

export function setExecutionHistoryDB(service: IExecutionHistory): void {
  dbService = service;
}

function getDB(): IExecutionHistory {
  if (!dbService)
    throw new Error(
      'Execution history DB not initialized. Call setExecutionHistoryDB() first.',
    );
  return dbService;
}

export async function getExecutionHistoryFn(
  self: DigitalTwin,
): Promise<DTExecutionResult[]> {
  return getDB().getByDTName(self.DTName);
}

export async function getExecutionHistoryByIdFn(
  self: DigitalTwin,
  executionId: string,
): Promise<DTExecutionResult | undefined> {
  const result = await getDB().getById(executionId);
  return result || undefined;
}

export async function updateExecutionLogsFn(
  self: DigitalTwin,
  executionId: string,
  jobLogs: JobLog[],
): Promise<void> {
  const execution = await getDB().getById(executionId);
  if (execution) {
    execution.jobLogs = jobLogs;
    await getDB().update(execution);

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
  const execution = await getDB().getById(executionId);
  if (execution) {
    execution.status = status;
    await getDB().update(execution);

    if (executionId === self.currentExecutionId) {
      self.lastExecutionStatus = status;
    }
  }
}
