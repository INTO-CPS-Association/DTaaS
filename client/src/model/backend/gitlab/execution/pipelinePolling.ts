/* eslint-disable no-await-in-loop */
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import {
  isPipelineCompleted,
  delay,
  hasTimedOut,
} from 'model/backend/gitlab/execution/pipelineCore';
import {
  MAX_EXECUTION_TIME,
  PIPELINE_POLL_INTERVAL,
} from 'model/backend/gitlab/digitalTwinConfig/constants';

export interface PollOptions {
  shouldAbort?: () => boolean;
}

function checkAbortConditions(
  pipelineId: number,
  startTime: number,
  options?: PollOptions,
): void {
  if (options?.shouldAbort?.()) {
    throw new Error(`Pipeline ${pipelineId} stopped by user.`);
  }
  if (hasTimedOut(startTime, MAX_EXECUTION_TIME)) {
    throw new Error(`Pipeline ${pipelineId} timed out.`);
  }
}

export async function* pollPipelineStatus(
  backend: BackendInterface,
  pipelineId: number,
  startTime: number,
  options?: PollOptions,
): AsyncGenerator<string, string, unknown> {
  let status = 'pending';
  yield status;

  while (!isPipelineCompleted(status)) {
    checkAbortConditions(pipelineId, startTime, options);
    await delay(PIPELINE_POLL_INTERVAL);
    try {
      const newStatus = await backend.getPipelineStatus(
        backend.getProjectId(),
        pipelineId,
      );
      if (newStatus && newStatus !== status) {
        status = newStatus;
        yield status;
      }
    } catch {
      // continue polling
    }
  }
  return status;
}
