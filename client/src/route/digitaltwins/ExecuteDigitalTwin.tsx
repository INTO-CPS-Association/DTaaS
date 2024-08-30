/* eslint-disable no-console */

import React, { useState, useEffect } from 'react';
import { CardActions, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, AlertColor, CircularProgress } from '@mui/material';
import { GitlabInstance } from 'util/gitlab';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { getAuthority } from 'util/envUtil';
import stripAnsi from 'strip-ansi';
import ansiRegex from 'ansi-regex';
import DigitalTwinCard from './DigitalTwinCard';

const formatName = (name: string) =>
  name
    .replace(/-/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const ExecuteDigitalTwin: React.FC<{ name: string }> = (props) => {
  const [gitlabInstance] = useState<GitlabInstance>(new GitlabInstance(sessionStorage.getItem('username') || '', getAuthority(), sessionStorage.getItem('access_token') || ''));
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwin | null>(null);   
  const [description, setDescription] = useState<string>('');
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const [jobLogs, setJobLogs] = useState<{ jobName: string; log: string }[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [pipelineCompleted, setPipelineCompleted] = useState(false);
  const [pipelineLoading, setPipelineLoading]  = useState(false);
  const [buttonText, setButtonText] = useState('Start');
  const [executionCount, setExecutionCount] = useState(0);

  const initialize = async () => {
    await gitlabInstance.init()
    const dt = new DigitalTwin(props.name, gitlabInstance);
    await dt.init();
    setDigitalTwin(dt);
    console.log('Digital twin:', dt);
    setDescription(dt.description);
  };

  useEffect(() => { 
    initialize();
  }, []);

  useEffect(() => {
    if (executionStatus) {
      setSnackbarMessage(`Execution ${executionStatus} for ${formatName(props.name)} (Run #${executionCount})`);
      setSnackbarSeverity(executionStatus === 'success' ? 'success' : 'error');
      setSnackbarOpen(true);
    }
  }, [executionStatus, executionCount, props.name]);

  const checkSecondPipelineStatus = async (projectId: number, pipelineId: number) => {
    const pipelineStatus = gitlabInstance ? await gitlabInstance.getPipelineStatus(projectId, pipelineId) : null;
    if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
      const pipelineIdJobs = pipelineId;
      setJobLogs(await fetchJobLogs(projectId, pipelineIdJobs));
      setPipelineCompleted(true);
      setPipelineLoading(false);
      setButtonText('Start');
    } else {
      setTimeout(() => checkSecondPipelineStatus(projectId, pipelineId), 5000);
    }
  };

  const checkFirstPipelineStatus = async (projectId: number, pipelineId: number) => {
    const pipelineStatus = gitlabInstance ? await gitlabInstance.getPipelineStatus(projectId, pipelineId) : null;
    if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
      checkSecondPipelineStatus(projectId, pipelineId+1);
    } else {
      setTimeout(() => checkFirstPipelineStatus(projectId, pipelineId), 5000);
    }
  };

  const fetchJobLogs = async (projectId: number, pipelineId: number) => {
    const jobs = gitlabInstance ? await gitlabInstance.getPipelineJobs(projectId, pipelineId) : [];
    console.log('gitlabinstance job', gitlabInstance);
    console.log(jobs);
    const logPromises = jobs.map(async (job) => {
        let log = gitlabInstance? await gitlabInstance.getJobTrace(projectId, job.id) : '';
        console.log('Log in fetchJobLogs:', log);
        if (typeof log === 'string') {
          log = stripAnsi(log).replace(ansiRegex(), '').split('\n').map(line =>
            line.replace(/section_start:\d+:[^A-Z]*/, '').replace(/section_end:\d+:[^A-Z]*/, '')
          ).join('\n');
        }
        return { jobName: job.name, log };
    });
    return (await Promise.all(logPromises)).reverse();
  };

  const handleStart = async () => {
    if (digitalTwin) {
      if (buttonText === 'Start') {
        setButtonText('Stop');
        setJobLogs([]);
        setPipelineCompleted(false);
        setPipelineLoading(true);
        const pipelineId = await digitalTwin.execute();
        setExecutionStatus(digitalTwin.executionStatus());
        setExecutionCount(prevCount => prevCount + 1);

        if (gitlabInstance && gitlabInstance.projectId && digitalTwin?.pipelineId && pipelineId) {
          checkFirstPipelineStatus(gitlabInstance.projectId, pipelineId);
        }
      } else {
        setButtonText('Start');
      }
    }
  };

  const handleStop = async () => {
    if (digitalTwin) {
      try {
        if (gitlabInstance && gitlabInstance.projectId && digitalTwin.pipelineId) {
          await digitalTwin.stop(gitlabInstance.projectId, digitalTwin.pipelineId);
        }
        setSnackbarMessage(`${formatName(props.name)} (Run #${executionCount}) execution stopped successfully`);
        setSnackbarSeverity('success');
      } catch (error) {
        setSnackbarMessage(`Failed to stop ${formatName(props.name)} (Run #${executionCount}) execution`);
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setButtonText('Start');
        setPipelineCompleted(true);
        setPipelineLoading(false);
      }
    }
  };

  const handleButtonClick = () => {
    if (buttonText === 'Start') {
      handleStart();
    } else {
      handleStop();
    }
  };

  const handleToggleLog = () => {
    setShowLog((prev) => !prev);
  };

  const handleCloseLog = () => {
    setShowLog(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
    {description? (
      <DigitalTwinCard name={formatName(props.name)} description={description}
      buttons={
        <CardActions style={{ padding: '16px', marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            color="primary"
            onClick={handleButtonClick}
            style={{ flexShrink: 0 }}
          >
            {buttonText}
          </Button>
          <Button size="small" color="primary" onClick={handleToggleLog} disabled={!pipelineCompleted}>
            Log
          </Button>
          {pipelineLoading ? <CircularProgress size={24}/> : null}
        </CardActions>}
      />
    ) : (
      <Typography>Loading...</Typography>
    )}

      <Dialog open={showLog} onClose={handleCloseLog} maxWidth="md">
        <DialogTitle>{`${formatName(props.name)} - log (run #${executionCount})`}</DialogTitle>
        <DialogContent dividers>
          {jobLogs.length > 0 ? (
            jobLogs.map((jobLog, index) => (
              <div key={index} style={{ marginBottom: '16px' }}>
                <Typography variant="h6">{jobLog.jobName}</Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {jobLog.log}
                </Typography>
              </div>
            ))
          ) : (
            <Typography variant="body2">No logs available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExecuteDigitalTwin;