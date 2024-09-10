import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { fetchJobLogs, updatePipelineStateOnCompletion } from './pipelineUtils';

interface PipelineStatusParams {
  setButtonText: Dispatch<SetStateAction<string>>;
  digitalTwin: DigitalTwin;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof useDispatch>;
}

export const checkFirstPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
}: PipelineStatusParams) => {
  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    digitalTwin.pipelineId!,
  );
  const params = {
    setButtonText,
    digitalTwin,
    setLogButtonDisabled,
    dispatch,
  };
  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    await checkSecondPipelineStatus(params);
  } else {
    checkFirstPipelineStatus(params);
  }
};

export const checkSecondPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
}: PipelineStatusParams) => {
  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    digitalTwin.pipelineId! + 1,
  );

  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    const pipelineIdJobs = digitalTwin.pipelineId! + 1;
    const jobLogs = await fetchJobLogs(
      digitalTwin.gitlabInstance,
      pipelineIdJobs,
    );
    updatePipelineStateOnCompletion(
      digitalTwin,
      jobLogs,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    const params = {
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    };
    checkSecondPipelineStatus(params);
  }
};
