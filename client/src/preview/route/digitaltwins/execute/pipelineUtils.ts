import { Dispatch, SetStateAction } from 'react';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import GitlabInstance from 'preview/util/gitlab';
import {
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'preview/store/digitalTwin.slice';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';

export const cleanLogContent = (input: string | null | undefined): string => {
  if (!input) return '';  
  let cleaned = input.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*[mK]/g, 
    ''
  );
  cleaned = cleaned.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
  
  const lines = cleaned.split('\n');
  const cleanedLines = lines.map(line => {
    if (line.match(/^section_(start|end):[0-9]+:[a-zA-Z0-9_-]+$/)) {
      return '';
    }
    
    return line
      .replace(/section_start:[0-9]+:[a-zA-Z0-9_-]+/g, '')
      .replace(/section_end:[0-9]+:[a-zA-Z0-9_-]+/g, '')
      .trim();
  });
  return cleanedLines
    .filter(line => line.length > 0)
    .join('\n');
}

export const startPipeline = async (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
) => {
  await digitalTwin.execute();
  const executionStatusMessage =
    digitalTwin.lastExecutionStatus === 'success'
      ? `Execution started successfully for ${formatName(digitalTwin.DTName)}. Wait until completion for the logs...`
      : `Execution ${digitalTwin.lastExecutionStatus} for ${formatName(digitalTwin.DTName)}`;
  dispatch(
    showSnackbar({
      message: executionStatusMessage,
      severity:
        digitalTwin.lastExecutionStatus === 'success' ? 'success' : 'error',
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
  gitlabInstance: GitlabInstance,
  pipelineId: number,
): Promise<Array<{ jobName: string; log: string }>> => {
  const {projectId} = gitlabInstance;
  if (!projectId) {
    return [];
  }
  
  const jobs = await gitlabInstance.getPipelineJobs(
    projectId,
    pipelineId,
  );
  
  const logPromises = jobs.map(async (job) => {
    if (!job || typeof job.id === 'undefined') {
      return { jobName: 'Unknown', log: 'Job ID not available' };
    }
    
    try {
      const logContent = await gitlabInstance.getJobTrace(
        projectId,
        job.id,
      );
      
      let cleanedLog = '';
      if (typeof logContent === 'string') {
        cleanedLog = cleanLogContent(logContent);
      }
      
      return { 
        jobName: typeof job.name === 'string' ? job.name : 'Unknown', 
        log: cleanedLog 
      };
    } catch (_e) {
      return { 
        jobName: typeof job.name === 'string' ? job.name : 'Unknown', 
        log: 'Error fetching log content' 
      };
    }
  });
  return (await Promise.all(logPromises)).reverse();
};