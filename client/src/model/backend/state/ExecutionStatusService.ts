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
import { ExecutionStatus } from 'model/backend/interfaces/execution';

class ExecutionStatusService {
  private static async resolveChildPipeline(
    execution: DTExecutionResult,
    backend: BackendInterface,
    executionStorage: IExecutionHistoryStorage,
  ): Promise<DTExecutionResult | null> {
    try {
      return await ExecutionStatusService.updateFinishedChildPipeline(
        execution,
        backend,
        executionStorage,
      );
    } catch {
      return ExecutionStatusService.markExecutionError(
        execution,
        executionStorage,
      );
    }
  }

  private static async markExecutionError(
    execution: DTExecutionResult,
    executionStorage: IExecutionHistoryStorage,
  ): Promise<DTExecutionResult> {
    const updated = { ...execution, status: ExecutionStatus.ERROR };
    await executionStorage.update(updated);
    return updated;
  }

  private static async updateFinishedChildPipeline(
    execution: DTExecutionResult,
    backend: BackendInterface,
    executionStorage: IExecutionHistoryStorage,
  ): Promise<DTExecutionResult | null> {
    const childPipeline = await ExecutionStatusService.getFinishedChildPipeline(
      backend,
      execution.pipelineId,
    );
    if (childPipeline == null) {
      return null;
    }
    const updated = await ExecutionStatusService.createChildPipelineResult(
      execution,
      backend,
      childPipeline.pipelineId,
      childPipeline.status,
    );
    await executionStorage.update(updated);
    return updated;
  }

  private static async getFinishedChildPipeline(
    backend: BackendInterface,
    parentPipelineId: number,
  ): Promise<{ pipelineId: number; status: string } | null> {
    const projectId = backend.getProjectId();
    const pipelineId = await backend.getChildPipelineId(
      projectId,
      parentPipelineId,
    );
    if (pipelineId == null) {
      return null;
    }
    const status = await backend.getPipelineStatus(projectId, pipelineId);
    return isFinishedStatus(status) ? { pipelineId, status } : null;
  }

  private static async createChildPipelineResult(
    execution: DTExecutionResult,
    backend: BackendInterface,
    childPipelineId: number,
    childPipelineStatus: string,
  ): Promise<DTExecutionResult> {
    return {
      ...execution,
      status: mapGitlabStatusToExecutionStatus(childPipelineStatus),
      jobLogs: await fetchJobLogs(backend, childPipelineId),
    };
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
    return ExecutionStatusService.processParentStatus(
      execution,
      backend,
      executionStorage,
      parentPipelineStatus,
    );
  }

  private static async processParentStatus(
    execution: DTExecutionResult,
    backend: BackendInterface,
    executionStorage: IExecutionHistoryStorage,
    parentPipelineStatus: string,
  ): Promise<DTExecutionResult | null> {
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
    const results = await Promise.all(
      runningExecutions.map(async (execution) => {
        try {
          return await ExecutionStatusService.processExecution(
            execution,
            digitalTwinsData,
            executionStorage,
          );
        } catch {
          return ExecutionStatusService.markExecutionError(
            execution,
            executionStorage,
          );
        }
      }),
    );
    return results.filter((r): r is DTExecutionResult => r !== null);
  }
}
export default ExecutionStatusService;
