import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import { PipelineStatusParams } from 'route/digitaltwins/execution/executionStatusManager';
import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

export const createMockEntry = (
  id: string,
  dtName: string,
  pipelineId: number,
  status: ExecutionStatus,
): DTExecutionResult => ({
  id,
  dtName,
  pipelineId,
  timestamp: Date.now(),
  status,
  jobLogs: [],
});

export const createExecutionStatusManagerSetup = () => {
  const setButtonText = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();
  const startTime = Date.now();
  const digitalTwin = mockDigitalTwin;
  const params: PipelineStatusParams = {
    setButtonText,
    digitalTwin,
    setLogButtonDisabled,
    dispatch,
  };
  const paramsWithStartTime = { ...params, startTime };
  const pipelineId = 1;

  const spyOnGetPipelineJobs = () =>
    jest.spyOn(digitalTwin.backend, 'getPipelineJobs').mockResolvedValue([]);

  const spyOnHandleTimeout = () =>
    jest.spyOn(PipelineChecks, 'handleTimeout').mockResolvedValue(undefined);

  const spyOnGetPipelineStatus = (status: string) =>
    jest
      .spyOn(digitalTwin.backend, 'getPipelineStatus')
      .mockResolvedValue(status);

  const spyOnCheckPipelineStatus = () =>
    jest
      .spyOn(PipelineChecks, 'checkChildPipelineStatus')
      .mockResolvedValue(undefined);

  return {
    setButtonText,
    setLogButtonDisabled,
    dispatch,
    startTime,
    digitalTwin,
    params,
    paramsWithStartTime,
    pipelineId,
    spyOnGetPipelineJobs,
    spyOnHandleTimeout,
    spyOnGetPipelineStatus,
    spyOnCheckPipelineStatus,
  };
};
