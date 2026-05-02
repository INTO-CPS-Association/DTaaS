/**
 * Main measurement page.
 *
 * - Controls (start, stop, download) are in ./MeasurementControls.tsx
 * - Results table is in ./MeasurementTable.tsx
 * - Trial cards and status indicators are in ./MeasurementComponents.tsx
 */
import Layout from 'page/Layout';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { showSnackbar } from 'store/snackbar.slice';
import {
  TimedTask,
  ExecutionResult,
  MeasurementSetters,
  measurementState,
  getDefaultConfig,
  attachSetters,
  detachSetters,
  getTasks,
} from 'model/backend/gitlab/measure/measurement.execution';
import {
  startMeasurement,
  stopAllPipelines,
  restartMeasurement,
  handleBeforeUnload,
  handleUnload,
  purgeMeasurementData,
} from 'model/backend/gitlab/measure/measurement.runner';
import {
  getMeasurementStatus,
  mergeExecutionStatus,
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/measurement.utils';
import { toggleTaskEnabled } from 'store/settings.slice';
import MeasurementControls, {
  CompletionSummary,
} from 'route/measurement/MeasurementControls';
import MeasurementTable from 'route/measurement/MeasurementTable';

function MeasurementPageHeader() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="h5">Digital Twin Measurement</Typography>
        <IconButton
          size="small"
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            color: 'text.secondary',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Typography variant="body2" color="text.secondary">
          Run performance measurements for Digital Twin executions. Each task
          runs a number of trials to calculate average time per task. Click{' '}
          <strong>Start</strong> to begin the measurement suite,{' '}
          <strong>Stop</strong> to cancel running executions, or{' '}
          <strong>Purge</strong> to permanently delete all measurement data from
          storage. Use <strong>Export</strong> to download results at any time.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You can navigate away from this page while a measurement is running
          and it will continue in the background. However,{' '}
          <strong>
            changing the URL, refreshing, or closing the tab will stop the
            execution
          </strong>
          {
            '. Notifications will inform you when a measurement completes or is stopped.'
          }
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You can change the number of trials, runner tags, and Digital Twin
          names in the{' '}
          <Link to="/account" style={{ color: 'inherit' }}>
            settings
          </Link>
          .
        </Typography>
      </Collapse>
    </Box>
  );
}

function initCurrentExecutions(): ExecutionResult[] {
  if (
    !measurementState.isRunning ||
    measurementState.currentTaskIndexUI === null
  ) {
    return [];
  }
  const task = getTasks()[measurementState.currentTaskIndexUI];
  const executions = task?.Executions?.() ?? [];
  return mergeExecutionStatus(
    executions,
    measurementState.activePipelines,
    measurementState.executionResults,
    getDefaultConfig(),
  );
}

function initInterruptedDialogOpen(): boolean {
  if (measurementState.restoredAfterRefresh) {
    measurementState.restoredAfterRefresh = false;
    return true;
  }
  return false;
}

function usePollingEffect(
  isRunning: boolean,
  currentTaskIndex: number | null,
  setCurrentExecutions: (executions: ExecutionResult[]) => void,
) {
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (currentTaskIndex === null) return;
      const task = getTasks()[currentTaskIndex];
      const executions = task?.Executions?.() ?? [];
      const merged = mergeExecutionStatus(
        executions,
        measurementState.activePipelines,
        measurementState.executionResults,
        getDefaultConfig(),
      );
      setCurrentExecutions(merged);
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, currentTaskIndex, setCurrentExecutions]);
}

function Measurement() {
  const dispatch = useDispatch();
  const {
    trials: iterations,
    secondaryRunnerTag: alternateRunnerTag,
    primaryDTName,
    secondaryDTName,
    disabledTaskNames,
  } = useSelector((state: RootState) => state.settings);
  const primaryRunnerTag = useSelector(
    (state: RootState) => state.settings.RUNNER_TAG,
  );
  const [results, setResults] = useState<TimedTask[]>(
    () => measurementState.results ?? [...getTasks()],
  );
  const [currentExecutions, setCurrentExecutions] = useState<ExecutionResult[]>(
    initCurrentExecutions,
  );
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(
    measurementState.isRunning ? measurementState.currentTaskIndexUI : null,
  );
  const [isRunning, setIsRunning] = useState(measurementState.isRunning);
  const [interruptedDialogOpen, setInterruptedDialogOpen] = useState(
    initInterruptedDialogOpen,
  );
  const [originalPrimaryRunnerTag, setOriginalPrimaryRunnerTag] = useState(
    measurementState.originalPrimaryRunnerTag ?? primaryRunnerTag,
  );
  const [originalSecondaryRunnerTag, setOriginalSecondaryRunnerTag] = useState(
    measurementState.originalSecondaryRunnerTag ?? alternateRunnerTag,
  );

  const setters: MeasurementSetters = {
    setIsRunning,
    setCurrentExecutions,
    setCurrentTaskIndex,
    setResults,
  };

  useEffect(() => {
    measurementState.results ??= [...getTasks()];
    attachSetters(setters);
    return () => detachSetters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePollingEffect(isRunning, currentTaskIndex, setCurrentExecutions);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) =>
      handleBeforeUnload(event, measurementState.isRunningRef);
    const onUnload = () => handleUnload(measurementState.isRunningRef);

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('unload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('unload', onUnload);
    };
  }, []);

  const handleStart = () => {
    setOriginalPrimaryRunnerTag(primaryRunnerTag);
    setOriginalSecondaryRunnerTag(alternateRunnerTag);
    dispatch(
      showSnackbar({ message: 'Measurement started', severity: 'info' }),
    );
    startMeasurement(setters, measurementState.isRunningRef);
  };

  const handleRestart = () => {
    setOriginalPrimaryRunnerTag(primaryRunnerTag);
    setOriginalSecondaryRunnerTag(alternateRunnerTag);
    dispatch(
      showSnackbar({ message: 'Measurement restarted', severity: 'info' }),
    );
    restartMeasurement(setters, measurementState.isRunningRef);
  };

  const handleStop = () => {
    dispatch(
      showSnackbar({ message: 'Stopping measurement...', severity: 'warning' }),
    );
    stopAllPipelines();
  };

  const handlePurge = async () => {
    await purgeMeasurementData();
    dispatch(
      showSnackbar({
        message: 'Measurement data purged',
        severity: 'warning',
        icon: 'ClearIcon',
      }),
    );
  };

  const { hasStarted, completedTasks, completedTrials } =
    getMeasurementStatus(results);
  const totalTasks = results.filter(
    (t) => !disabledTaskNames.includes(t['Task Name']),
  ).length;
  const effectivePrimaryTag = isRunning
    ? originalPrimaryRunnerTag
    : primaryRunnerTag;
  const effectiveSecondaryTag = isRunning
    ? originalSecondaryRunnerTag
    : alternateRunnerTag;

  return (
    <Layout sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', p: 3, alignSelf: 'center' }}>
        <Dialog
          open={interruptedDialogOpen}
          onClose={() => setInterruptedDialogOpen(false)}
        >
          <DialogTitle>Previous session interrupted</DialogTitle>
          <DialogContent>
            <DialogContentText>
              A measurement was running when you last left this page. Active
              tasks have been marked as stopped. You can restart or export any
              partial results.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setInterruptedDialogOpen(false)}
              variant="contained"
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
        <MeasurementPageHeader />
        <Paper sx={{ p: 3 }}>
          <MeasurementControls
            isRunning={isRunning}
            hasStarted={hasStarted}
            iterations={iterations}
            completedTasks={completedTasks}
            completedTrials={completedTrials}
            totalTasks={totalTasks}
            results={results}
            onStart={handleStart}
            onRestart={handleRestart}
            onStop={handleStop}
            onPurge={handlePurge}
          />
          <MeasurementTable
            results={results}
            currentTaskIndex={currentTaskIndex}
            currentExecutions={currentExecutions}
            onDownloadTask={downloadTaskResultJson}
            primaryRunnerTag={effectivePrimaryTag}
            secondaryRunnerTag={effectiveSecondaryTag}
            primaryDTName={primaryDTName}
            secondaryDTName={secondaryDTName}
            isRunning={isRunning}
            disabledTaskNames={disabledTaskNames}
            onToggleTask={(name) => dispatch(toggleTaskEnabled(name))}
          />
          <CompletionSummary
            results={results}
            isRunning={isRunning}
            hasStarted={hasStarted}
          />
        </Paper>
      </Box>
    </Layout>
  );
}

export default Measurement;
