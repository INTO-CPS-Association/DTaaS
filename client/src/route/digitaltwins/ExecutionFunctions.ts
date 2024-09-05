import { Dispatch, SetStateAction } from "react";
import { AlertColor } from "@mui/material";
import DigitalTwin from "util/gitlabDigitalTwin";
import { GitlabInstance } from "util/gitlab";
import stripAnsi from "strip-ansi";
import { JobLog } from "../../components/asset/StartStopButton";

export const handleButtonClick = (
    buttonText: string,
    setButtonText: Dispatch<SetStateAction<string>>,
    setJobLogs: Dispatch<SetStateAction<JobLog[]>>,
    setPipelineCompleted: Dispatch<SetStateAction<boolean>>,
    setPipelineLoading: Dispatch<SetStateAction<boolean>>,
    setExecutionStatus: Dispatch<SetStateAction<string | null>>,
    setExecutionCount: Dispatch<SetStateAction<number>>,
    digitalTwin: DigitalTwin,
    setSnackbarMessage: Dispatch<SetStateAction<string>>,
    setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
    setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
    executionCount: number,
  ) => {
    if (buttonText === 'Start') {
      handleStart(
        buttonText,
        setButtonText,
        setJobLogs,
        setPipelineCompleted,
        setPipelineLoading,
        setExecutionStatus,
        setExecutionCount,
        digitalTwin,
      );
    } else {
      handleStop(
        digitalTwin,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        executionCount,
        setButtonText,
        setPipelineCompleted,
        setPipelineLoading,
      );
    }
  };
  
export const handleStart = async (
    buttonText: string,
    setButtonText: Dispatch<SetStateAction<string>>,
    setJobLogs: Dispatch<SetStateAction<JobLog[]>>,
    setPipelineCompleted: Dispatch<SetStateAction<boolean>>,
    setPipelineLoading: Dispatch<SetStateAction<boolean>>,
    setExecutionStatus: Dispatch<SetStateAction<string | null>>,
    setExecutionCount: Dispatch<SetStateAction<number>>,
    digitalTwin: DigitalTwin,
  ) => {
    if (buttonText === 'Start') {
      setButtonText('Stop');
      setJobLogs([]);
      setPipelineCompleted(false);
      setPipelineLoading(true);
      await digitalTwin.execute();
      setExecutionStatus(digitalTwin.executionStatus());
      setExecutionCount((prevCount) => prevCount + 1);
  
      checkFirstPipelineStatus(
        digitalTwin.gitlabInstance,
        digitalTwin.pipelineId!,
        setJobLogs,
        setPipelineCompleted,
        setPipelineLoading,
        setButtonText,
      );
    } else {
      setButtonText('Start');
    }
  };
  
export const checkFirstPipelineStatus = async (
    gitlabInstance: GitlabInstance,
    pipelineId: number,
    setJobLogs: Dispatch<SetStateAction<JobLog[]>>,
    setPipelineCompleted: Dispatch<SetStateAction<boolean>>,
    setPipelineLoading: Dispatch<SetStateAction<boolean>>,
    setButtonText: Dispatch<SetStateAction<string>>,
  ) => {
    const pipelineStatus = await gitlabInstance.getPipelineStatus(
      gitlabInstance.projectId!,
      pipelineId,
    );
    if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
      checkSecondPipelineStatus(
        gitlabInstance,
        pipelineId + 1,
        setJobLogs,
        setPipelineCompleted,
        setPipelineLoading,
        setButtonText,
      );
    } else {
      setTimeout(
        () =>
          checkFirstPipelineStatus(
            gitlabInstance,
            pipelineId,
            setJobLogs,
            setPipelineCompleted,
            setPipelineLoading,
            setButtonText,
          ),
        5000,
      );
    }
  };
  
export const checkSecondPipelineStatus = async (
    gitlabInstance: GitlabInstance,
    pipelineId: number,
    setJobLogs: Dispatch<SetStateAction<JobLog[]>>,
    setPipelineCompleted: Dispatch<SetStateAction<boolean>>,
    setPipelineLoading: Dispatch<SetStateAction<boolean>>,
    setButtonText: Dispatch<SetStateAction<string>>,
  ) => {
    const pipelineStatus = await gitlabInstance.getPipelineStatus(
      gitlabInstance.projectId!,
      pipelineId,
    );
    if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
      const pipelineIdJobs = pipelineId;
      setJobLogs(await fetchJobLogs(gitlabInstance, pipelineIdJobs));
      setPipelineCompleted(true);
      setPipelineLoading(false);
      setButtonText('Start');
    } else {
      setTimeout(
        () =>
          checkSecondPipelineStatus(
            gitlabInstance,
            pipelineId,
            setJobLogs,
            setPipelineCompleted,
            setPipelineLoading,
            setButtonText,
          ),
        5000,
      );
    }
  };
  
  export const fetchJobLogs = async (
    gitlabInstance: GitlabInstance,
    pipelineId: number,
  ) => {
    const jobs = await gitlabInstance.getPipelineJobs(
      gitlabInstance.projectId!,
      pipelineId,
    );
    const logPromises = jobs.map(async (job) => {
      let log = await gitlabInstance.getJobTrace(
        gitlabInstance.projectId!,
        job.id,
      );
      if (typeof log === 'string') {
        log = stripAnsi(log)
          .split('\n')
          .map((line) =>
            line
              .replace(/section_start:\d+:[^A-Z]*/, '')
              .replace(/section_end:\d+:[^A-Z]*/, ''),
          )
          .join('\n');
      }
      return { jobName: job.name, log };
    });
    return (await Promise.all(logPromises)).reverse();
  };
  
  export const handleStop = async (
    digitalTwin: DigitalTwin,
    setSnackbarMessage: Dispatch<SetStateAction<string>>,
    setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
    setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
    executionCount: number,
    setButtonText: Dispatch<SetStateAction<string>>,
    setPipelineCompleted: Dispatch<SetStateAction<boolean>>,
    setPipelineLoading: Dispatch<SetStateAction<boolean>>,
  ) => {
    try {
      if (digitalTwin.gitlabInstance.projectId && digitalTwin.pipelineId) {
        await digitalTwin.stop(
          digitalTwin.gitlabInstance.projectId,
          digitalTwin.pipelineId,
        );
        await digitalTwin.stop(
          digitalTwin.gitlabInstance.projectId,
          digitalTwin.pipelineId + 1,
        );
      }
      setSnackbarMessage(
        `${digitalTwin.DTName} (Run #${executionCount}) execution stopped successfully`,
      );
      setSnackbarSeverity('success');
    } catch (error) {
      setSnackbarMessage(
        `Failed to stop ${digitalTwin.DTName} (Run #${executionCount}) execution`,
      );
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setButtonText('Start');
      setPipelineCompleted(true);
      setPipelineLoading(false);
    }
  };