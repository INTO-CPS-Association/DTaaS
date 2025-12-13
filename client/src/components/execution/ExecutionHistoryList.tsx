import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconButton,
  Typography,
  Paper,
  Box,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { JobLog } from 'model/backend/gitlab/types/executionHistory';
import {
  fetchExecutionHistory,
  removeExecution,
  setSelectedExecutionId,
} from 'model/backend/state/executionHistory.slice';
import {
  selectExecutionHistoryByDTName,
  selectExecutionHistoryLoading,
  selectSelectedExecution,
} from 'model/backend/state/executionHistory.selectors';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import { handleStop } from 'route/digitaltwins/execution/executionButtonHandlers';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

interface ExecutionHistoryListProps {
  dtName: string;
  onViewLogs: (executionId: string) => void;
}

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return <CheckCircleIcon color="success" />;
    case ExecutionStatus.FAILED:
      return <ErrorIcon color="error" />;
    case ExecutionStatus.CANCELED:
      return <CancelIcon color="warning" />;
    case ExecutionStatus.TIMEOUT:
      return <HourglassEmptyIcon color="warning" />;
    case ExecutionStatus.RUNNING:
      return <CircularProgress size={20} />;
    default:
      return <AccessTimeIcon />;
  }
};

const getStatusText = (status: ExecutionStatus): string => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return 'Completed';
    case ExecutionStatus.FAILED:
      return 'Failed';
    case ExecutionStatus.CANCELED:
      return 'Canceled';
    case ExecutionStatus.TIMEOUT:
      return 'Timed out';
    case ExecutionStatus.RUNNING:
      return 'Running';
    default:
      return 'Unknown';
  }
};

interface DeleteConfirmationDialogProps {
  open: boolean;
  executionId: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  executionId,
  onClose,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Confirm Deletion</DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete this execution history entry?
        {executionId && (
          <>
            <br />
            <strong>Execution ID:</strong> {executionId.slice(-8)}
          </>
        )}
        <br />
        This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="primary">
        Cancel
      </Button>
      <Button onClick={onConfirm} color="error">
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

const ExecutionHistoryList: React.FC<ExecutionHistoryListProps> = ({
  dtName,
  onViewLogs,
}) => {
  // Use typed dispatch for thunk actions
  const dispatch =
    useDispatch<ThunkDispatch<RootState, unknown, Action<string>>>();
  const executions = useSelector(selectExecutionHistoryByDTName(dtName));
  const loading = useSelector(selectExecutionHistoryLoading);
  const digitalTwin = useSelector(selectDigitalTwinByName(dtName));
  const selectedExecution = useSelector(selectSelectedExecution);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [executionToDelete, setExecutionToDelete] = useState<string | null>(
    null,
  );

  const [expandedExecution, setExpandedExecution] = useState<string | false>(
    false,
  );

  useEffect(() => {
    dispatch(fetchExecutionHistory(dtName));
  }, [dispatch, dtName]);

  const handleAccordionChange =
    (executionId: string) =>
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedExecution(isExpanded ? executionId : false);
      if (isExpanded) {
        handleViewLogs(executionId);
      }
    };

  const handleDeleteClick = (executionId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent accordion from toggling
    }
    setExecutionToDelete(executionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (executionToDelete) {
      dispatch(removeExecution(executionToDelete));
    }
    setDeleteDialogOpen(false);
    setExecutionToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setExecutionToDelete(null);
  };

  const handleViewLogs = (executionId: string) => {
    dispatch(setSelectedExecutionId(executionId));
    onViewLogs(executionId);
  };

  const handleStopExecution = async (
    executionId: string,
    event?: React.MouseEvent,
  ) => {
    if (event) {
      event.stopPropagation();
    }
    if (digitalTwin) {
      const digitalTwinInstance = await createDigitalTwinFromData(
        digitalTwin,
        digitalTwin.DTName,
      );

      // Dummy function since we don't need to change button text
      const setButtonText = () => {};
      handleStop(digitalTwinInstance, setButtonText, dispatch, executionId);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <div data-testid="circular-progress">
          <CircularProgress data-testid="progress-indicator" />
        </div>
      </Box>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="body1" align="center">
          No execution history found. Start an execution to see it here.
        </Typography>
      </Paper>
    );
  }

  const sortedExecutions = [...executions].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  return (
    <>
      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        executionId={executionToDelete}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
      <Paper elevation={2} sx={{ mt: 2 }}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Execution History
          </Typography>
          {sortedExecutions.map((execution) => (
            <Accordion
              key={execution.id}
              expanded={expandedExecution === execution.id}
              onChange={handleAccordionChange(execution.id)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`execution-${execution.id}-content`}
                id={`execution-${execution.id}-header`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  '& .MuiAccordionSummary-content': {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                }}
              >
                <Box display="flex" alignItems="center">
                  <Box mr={2}>{getStatusIcon(execution.status)}</Box>
                  <Box>
                    <Typography>
                      {formatTimestamp(execution.timestamp)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Status: {getStatusText(execution.status)}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  display="flex"
                  alignItems="center"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="action-buttons-container"
                >
                  {execution.status === ExecutionStatus.RUNNING && (
                    <Tooltip title="Stop Execution">
                      <IconButton
                        component="div"
                        edge="end"
                        aria-label="stop"
                        onClick={(e) => handleStopExecution(execution.id, e)}
                        size="small"
                      >
                        <StopIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton
                      component="div"
                      edge="end"
                      aria-label="delete"
                      onClick={(e) => handleDeleteClick(execution.id, e)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {(() => {
                  if (
                    !selectedExecution ||
                    selectedExecution.id !== execution.id
                  ) {
                    return (
                      <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress size={24} />
                      </Box>
                    );
                  }

                  if (selectedExecution.jobLogs.length === 0) {
                    return (
                      <Typography variant="body2">No logs available</Typography>
                    );
                  }

                  return selectedExecution.jobLogs.map(
                    (jobLog: JobLog, index: number) => (
                      <div
                        key={`${jobLog.jobName}-${index}`}
                        style={{ marginBottom: '16px' }}
                      >
                        <Typography variant="h6">{jobLog.jobName}</Typography>
                        <Typography
                          variant="body2"
                          style={{ whiteSpace: 'pre-wrap' }}
                        >
                          {jobLog.log}
                        </Typography>
                      </div>
                    ),
                  );
                })()}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Paper>
    </>
  );
};

export default ExecutionHistoryList;
