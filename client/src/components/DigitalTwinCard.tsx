import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardActions, Typography, Button, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { GitlabInstance } from 'util/gitlab';
import DigitalTwin from 'util/gitlabDigitalTwin';

const formatName = (name: string) =>
  name
    .replace(/-/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const DigitalTwinCard: React.FC<{ name: string, gitlabInstance: GitlabInstance }> = (props) => {
  const [digitalTwin, setDigitalTwin] = useState<DigitalTwin | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [runnerTags, setRunnerTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [jobLogs, setJobLogs] = useState<{ jobName: string; log: string }[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initDigitalTwin = async () => {
      setLoading(true);
      const dt = new DigitalTwin(props.name, props.gitlabInstance);
      await dt.initDescription();
      setDigitalTwin(dt);
      setDescription(dt.description);
      setLoading(false);
    };

    const fetchRunnerTags = async () => {
      const projectId = await props.gitlabInstance.getProjectId();
      if (projectId !== null) {
        const tags = await props.gitlabInstance.getRunnerTags(projectId);
        setRunnerTags(tags);
        setSelectedTag(tags[0] || '');
      }
    };

    initDigitalTwin();
    fetchRunnerTags();
  }, [props.name, props.gitlabInstance]);

  const handleStartStop = async () => {
    if (digitalTwin && selectedTag) {
      const pipelineId = await digitalTwin.execute(selectedTag);
      setExecutionStatus(digitalTwin.executionStatus());
  
      const projectId = await props.gitlabInstance.getProjectId();
  
      if (projectId && pipelineId) {
        // Ottieni i job della pipeline
        const jobs = await props.gitlabInstance.getPipelineJobs(projectId, pipelineId);
  
        // Ottieni i log di ciascun job
        const logs = await Promise.all(
          jobs.map(async (job) => {
            const log = await props.gitlabInstance.getJobTrace(projectId, job.id);
            return { jobName: job.name, log };
          })
        );
  
        setJobLogs(logs);
      }
    }
  };
  

  const handleToggleLog = () => {
    setShowLog((prev) => !prev);
  };

  const handleCloseLog = () => {
    setShowLog(false);
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!description) {
    return null;
  }

  return (
    <>
      <Card style={{ width: 300, height: 350, margin: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <CardContent style={{ flex: 1, overflow: 'hidden' }}>
          <Typography variant="h5" component="div" gutterBottom>
            {formatName(props.name)}
          </Typography>
          <div style={{ 
            maxHeight: '96px', 
            overflowY: 'auto',
            transition: 'max-height 0.3s ease',
            paddingRight: '8px' 
          }}>
            <Typography variant="body2" color="textSecondary">
              {description}
            </Typography>
          </div>
        </CardContent>
        <CardActions style={{ padding: '16px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormControl style={{ minWidth: 120, flex: 1, marginRight: '8px' }}>
            <InputLabel variant="standard" id="runner-tag-label">Runner Tag</InputLabel>
            <Select
              inputProps={{
                name: 'runner-tag',
                id: 'runner-tag-select',
              }}
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value as string)}
              variant="outlined"
            >
              {runnerTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button size="small" color="primary" onClick={handleStartStop} style={{ flexShrink: 0 }}>
            Start/Stop
          </Button>
        </CardActions>
        <CardActions style={{ padding: '16px', marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
          <Button size="small" color="primary" onClick={handleToggleLog}>
            Log
          </Button>
        </CardActions>
        {executionStatus && (
          <Typography variant="body2" color={executionStatus === 'success' ? 'green' : 'red'} style={{ padding: '16px' }}>
            {executionStatus}
          </Typography>
        )}
      </Card>

      <Dialog open={showLog} onClose={handleCloseLog} maxWidth="sm" fullWidth>
      <DialogTitle>{formatName(props.name)} Log</DialogTitle>
      <DialogContent dividers>
        {jobLogs.length > 0 ? (
          jobLogs.map((jobLog, index) => (
            <div key={index} style={{ marginBottom: '16px' }}>
              <Typography variant="h6">{jobLog.jobName}</Typography>
              <Typography variant="body1" color="textSecondary">----------------------------</Typography>
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

    </>
  );
};

export default DigitalTwinCard;
