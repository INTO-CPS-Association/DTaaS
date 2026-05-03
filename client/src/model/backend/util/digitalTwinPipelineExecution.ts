import type DigitalTwin from 'model/backend/digitalTwin';
import {
  getRunnerTag,
  getBranchName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import {
  ExecutionStatus,
  type IExecutionHistory,
} from 'model/backend/interfaces/execution';
import { ProjectId } from 'model/backend/interfaces/backendInterfaces';
import { v4 as uuidv4 } from 'uuid';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import {
  isValidInstance,
  logError,
  logSuccess,
} from 'model/backend/util/digitalTwinUtils';

let dbService: IExecutionHistory | null = null;

export function setPipelineExecutionDB(service: IExecutionHistory): void {
  dbService = service;
}

function getDB(): IExecutionHistory {
  if (!dbService)
    throw new Error(
      'Pipeline execution DB not initialized. Call setPipelineExecutionDB() first.',
    );
  return dbService;
}

export async function executeDT(
  self: DigitalTwin,
  skipHistorySave: boolean = false,
  runnerTagOverride?: string,
  branchNameOverride?: string,
): Promise<number | null> {
  const runnerTag = runnerTagOverride ?? getRunnerTag();
  if (!isValidInstance(self)) {
    logError(self, runnerTag, 'Missing projectId or triggerToken');
    return null;
  }

  try {
    const variables = { DTName: self.DTName, RunnerTag: runnerTag };
    const response = await self.backend.startPipeline(
      self.backend.getProjectId(),
      branchNameOverride ?? getBranchName(),
      variables,
    );
    logSuccess(self, runnerTag);
    self.pipelineId = response.id;
    self.activePipelineIds.push(response.id);

    const executionId = uuidv4();
    self.currentExecutionId = executionId;

    if (!skipHistorySave) {
      const executionEntry: DTExecutionResult = {
        id: executionId,
        dtName: self.DTName,
        pipelineId: response.id,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      };

      await getDB().add(executionEntry);
    }

    return response.id;
  } catch (error) {
    logError(self, runnerTag, String(error));
    return null;
  }
}

const calcPipelineId = (pipeline: string, baseId: number): number =>
  pipeline === 'parentPipeline' ? baseId : baseId + 1;

export async function resolvePipelineIdFn(
  self: DigitalTwin,
  pipeline: string,
  executionId?: string,
): Promise<number | null> {
  if (executionId) {
    const execution = await getDB().getById(executionId);
    return execution ? calcPipelineId(pipeline, execution.pipelineId) : null;
  }
  return calcPipelineId(pipeline, self.pipelineId!);
}

export async function stopDT(
  self: DigitalTwin,
  projectId: ProjectId,
  pipeline: string,
  executionId?: string,
): Promise<void> {
  const runnerTag = getRunnerTag();
  const pipelineId = await resolvePipelineIdFn(self, pipeline, executionId);

  if (!pipelineId) {
    return;
  }

  try {
    await self.backend.api.cancelPipeline(projectId, pipelineId);
    self.backend.logs.push({
      status: 'canceled',
      DTName: self.DTName,
      runnerTag,
    });
    self.lastExecutionStatus = ExecutionStatus.CANCELED;

    const idToUpdate = executionId || self.currentExecutionId;
    if (idToUpdate) {
      await self.updateExecutionStatus(idToUpdate, ExecutionStatus.CANCELED);
    }

    self.activePipelineIds = self.activePipelineIds.filter(
      (id) => id !== pipelineId,
    );
  } catch (error) {
    self.backend.logs.push({
      status: 'error',
      error: new Error(String(error)),
      DTName: self.DTName,
      runnerTag,
    });
    self.lastExecutionStatus = ExecutionStatus.ERROR;
  }
}
