import { Dispatch, SetStateAction } from 'react';
import { Camelize, JobSchema } from '@gitbeaker/rest';
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
  cleaned = cleaned.split('\n').map(line => {
    if (line.includes('section_start:')) {
      return line.replace(/section_start:[0-9]+:[a-zA-Z0-9_]+/g, '').trim();
    }
    if (line.includes('section_end:')) {
      return line.replace(/section_end:[0-9]+:[a-zA-Z0-9_]+/g, '').trim();
    }
    return line;
  }).join('\n');
  
  return cleaned;
};

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
interface JobLogResult {
  jobName: string;
  log: string;
}

type GitlabJob = JobSchema | Camelize<JobSchema>;

const extractJobName = (job: GitlabJob | null | undefined): string => {
  if (!job) return 'Unknown';
  
  return typeof job.name === 'string' ? job.name : 'Unknown';
};

const processJob = async (
  job: GitlabJob | null | undefined,
  projectId: number,
  gitlabInstance: GitlabInstance
): Promise<JobLogResult> => {
  if (!job || typeof job.id === 'undefined') {
    return { jobName: 'Unknown', log: 'Job ID not available' };
  }
  
  const jobName = extractJobName(job);
  
  try {
    const trace = await gitlabInstance.getJobTrace(projectId, job.id);
    const logContent = typeof trace === 'string' ? cleanLogContent(trace) : 'Error fetching log content';
    return { jobName, log: logContent };
  } catch (_traceError) {
    return { jobName, log: 'Error fetching log content' };
  }
};

export const fetchJobLogs = async (
  gitlabInstance: GitlabInstance,
  pipelineId: number,
): Promise<JobLogResult[]> => {
  try {
    if (!gitlabInstance.projectId) {
      return [];
    }
    
    const { projectId } = gitlabInstance;
  
    const jobs = await gitlabInstance.getPipelineJobs(
      projectId,
      pipelineId,
    );
    
    const jobLogPromises = (jobs || []).map(job => processJob(job, projectId, gitlabInstance));
    
    return (await Promise.all(jobLogPromises)).reverse();
  } catch (_error) {
    return [];
  }
};