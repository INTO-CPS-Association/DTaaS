import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { IExecutionHistoryStorage } from 'model/backend/interfaces/sharedInterfaces';
import { fetchJobLogs } from 'model/backend/gitlab/execution/logFetching';
import {
  mapGitlabStatusToExecutionStatus,
  isFinishedStatus,
  isFailureStatus,
  isCanceledStatus,
  isSuccessStatus,
} from 'model/backend/gitlab/execution/statusChecking';

class ExecutionStatusService {
  private static async resolveChildPipeline(
    execution: DTExecutionResult,
    backend: BackendInterface,
    executionStorage: IExecutionHistoryStorage,
  ): Promise<DTExecutionResult | null> {
    const childPipelineId = execution.pipelineId + 1;
    try {
      const childPipelineStatus = await backend.getPipelineStatus(
        backend.getProjectId(),
        childPipelineId,
      );
      if (!isFinishedStatus(childPipelineStatus)) {
        return null;
      }
      const updated = {
        ...execution,
        status: mapGitlabStatusToExecutionStatus(childPipelineStatus),
        jobLogs: await fetchJobLogs(backend, childPipelineId),
      };
      await executionStorage.update(updated);
      return updated;
    } catch {
      // Child pipeline might not exist yet or other error - silently ignore
      return null;
    }
  }

  private static async processExecution(
    execution: DTExecutionResult,
    digitalTwinsData: { [key: string]: DigitalTwinData },
    executionStorage: IExecutionHistoryStorage,
  ): Promise<DTExecutionResult | null> {
    const digitalTwinData = digitalTwinsData[execution.dtName];
    if (digitalTwinData?.gitlabProjectId == null) {
      return null;
    }
    const digitalTwin = await createDigitalTwinFromData(
      digitalTwinData,
      execution.dtName,
    );
    const { backend } = digitalTwin;
    const parentPipelineStatus = await backend.getPipelineStatus(
      backend.getProjectId(),
      execution.pipelineId,
    );
    if (
      isFailureStatus(parentPipelineStatus) ||
      isCanceledStatus(parentPipelineStatus)
    ) {
      const updated = {
        ...execution,
        status: mapGitlabStatusToExecutionStatus(parentPipelineStatus),
      };
      await executionStorage.update(updated);
      return updated;
    }
    if (!isSuccessStatus(parentPipelineStatus)) {
      return null;
    }
    return ExecutionStatusService.resolveChildPipeline(
      execution,
      backend,
      executionStorage,
    );
  }

  static async checkRunningExecutions(
    runningExecutions: DTExecutionResult[],
    digitalTwinsData: { [key: string]: DigitalTwinData },
    executionStorage: IExecutionHistoryStorage,
  ): Promise<DTExecutionResult[]> {
    if (runningExecutions.length === 0) {
      return [];
    }
    const results = await Promise.all(
      runningExecutions.map(async (execution) => {
        try {
          return await ExecutionStatusService.processExecution(
            execution,
            digitalTwinsData,
            executionStorage,
          );
        } catch {
          return null;
        }
      }),
    );
    return results.filter((r): r is DTExecutionResult => r !== null);
  }
}
export default ExecutionStatusService;
