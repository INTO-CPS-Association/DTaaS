// Measurement action buttons (start, stop, restart, export, purge) and confirmation dialog
import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { TimedTask } from 'model/backend/gitlab/measure/measurement.execution';
import {
  getTotalTime,
  downloadResultsJson,
  isTaskComplete,
} from 'model/backend/gitlab/measure/measurement.utils';

interface MeasurementControlsProps {
  isRunning: boolean;
  hasStarted: boolean;
  iterations: number;
  completedTasks: number;
  completedTrials: number;
  totalTasks: number;
  results: TimedTask[];
  onStart: () => void;
  onRestart: () => void;
  onStop: () => void;
  onPurge: () => void;
}

interface CompletionSummaryProps {
  results: TimedTask[];
  isRunning: boolean;
  hasStarted: boolean;
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
}>) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function MeasurementControls({
  isRunning,
  hasStarted,
  iterations,
  completedTasks,
  completedTrials,
  totalTasks,
  results,
  onStart,
  onRestart,
  onStop,
  onPurge,
}: Readonly<MeasurementControlsProps>) {
  const [stopDialogOpen, setStopDialogOpen] = useState(false);

  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  const noTasksEnabled = totalTasks === 0;
  const isComplete = completedTasks === totalTasks && totalTasks > 0;
  const hasAnyResults = results.some((t) => t.Trials.some(isTaskComplete));

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Typography variant="body1" sx={{ color: 'primary.main' }}>
          Trials Completed: {completedTrials}/{totalTasks * iterations}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onStart}
            size="small"
            disabled={noTasksEnabled || isComplete || hasStarted}
          >
            Start
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setStopDialogOpen(true)}
            size="small"
            disabled={!isRunning}
          >
            Stop
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={onRestart}
            disabled={noTasksEnabled || !hasStarted || isRunning}
            size="small"
          >
            Restart
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => downloadResultsJson(results)}
            disabled={!hasAnyResults}
            size="small"
          >
            Export
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => setPurgeDialogOpen(true)}
            disabled={isRunning}
            size="small"
          >
            Purge
          </Button>
        </Box>
      </Box>
      <ConfirmDialog
        open={stopDialogOpen}
        onClose={() => setStopDialogOpen(false)}
        onConfirm={() => {
          setStopDialogOpen(false);
          onStop();
        }}
        title="Stop Measurement?"
        description="Are you sure you want to stop the measurement? This will cancel all running executions and mark the current task as stopped."
        confirmLabel="Stop"
      />

      <ConfirmDialog
        open={purgeDialogOpen}
        onClose={() => setPurgeDialogOpen(false)}
        onConfirm={() => {
          setPurgeDialogOpen(false);
          onPurge();
        }}
        title="Purge Measurement Data?"
        description="Are you sure you want to purge all measurement data? This will permanently delete all results and cannot be undone."
        confirmLabel="Purge"
      />
    </Box>
  );
}

export function CompletionSummary({
  results,
  isRunning,
  hasStarted,
}: Readonly<CompletionSummaryProps>) {
  const totalTime = getTotalTime(results);
  const allComplete = results.every(isTaskComplete);

  if (allComplete && totalTime !== null) {
    return (
      <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">
          Completed in {totalTime.toFixed(1)}s
        </Typography>
        <Typography variant="body2">
          Measurement data generation complete
        </Typography>
      </Box>
    );
  }

  if (isRunning || hasStarted) {
    return (
      <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">
          Measurement data generation in progress
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="body2">
        Click Start to generate measurement data
      </Typography>
    </Box>
  );
}
