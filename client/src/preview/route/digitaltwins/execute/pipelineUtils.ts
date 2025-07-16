import { Dispatch, SetStateAction } from 'react';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import { fetchJobLogs as fetchJobLogsCore } from 'model/backend/gitlab/execution/logFetching';
import { BackendInterface } from 'model/backend/gitlab/UtilityInterfaces';
import {
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'preview/store/digitalTwin.slice';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';

export const startPipeline = async (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
) => {
  await digitalTwin.execute();
  const executionStatusMessage =
    digitalTwin.lastExecutionStatus === ExecutionStatus.SUCCESS
      ? `Execution started successfully for ${formatName(digitalTwin.DTName)}. Wait until completion for the logs...`
      : `Execution ${digitalTwin.lastExecutionStatus} for ${formatName(digitalTwin.DTName)}`;
  dispatch(
    showSnackbar({
      message: executionStatusMessage,
      severity:
        digitalTwin.lastExecutionStatus === ExecutionStatus.SUCCESS
          ? ExecutionStatus.SUCCESS
          : ExecutionStatus.ERROR,
    }),
  );
  setLogButtonDisabled(true);
};

export const updatePipelineState = (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: false,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: true,
    }),
  );
};

export const updatePipelineStateOnCompletion = (
  digitalTwin: DigitalTwin,
  jobLogs: { jobName: string; log: string }[],
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(setJobLogs({ assetName: digitalTwin.DTName, jobLogs }));
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: true,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: false,
    }),
  );
  setButtonText('Start');
  setLogButtonDisabled(false);
};

export const updatePipelineStateOnStop = (
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  setButtonText('Start');
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: true,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: false,
    }),
  );
};

export const fetchJobLogs = async (
  backend: BackendInterface,
  pipelineId: number,
): Promise<Array<{ jobName: string; log: string }>> =>
  fetchJobLogsCore(backend, pipelineId);
