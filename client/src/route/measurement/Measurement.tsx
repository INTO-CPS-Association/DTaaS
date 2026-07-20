import Layout from 'page/Layout';
import { Alert, Box, Paper } from '@mui/material';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { showSnackbar } from 'store/snackbar.slice';
import {
  TimedTask,
  ExecutionResult,
  MeasurementSetters,
  measurementState,
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
  downloadTaskResultJson,
} from 'model/backend/gitlab/measure/measurement.utils';
import { toggleTaskEnabled } from 'store/settings.slice';
import MeasurementControls, {
  CompletionSummary,
} from 'route/measurement/MeasurementControls';
import MeasurementTable from 'route/measurement/MeasurementTable';
import MeasurementPageHeader from 'route/measurement/MeasurementPageHeader';
import InterruptedSessionDialog from 'route/measurement/InterruptedSessionDialog';
import {
  initCurrentExecutions,
  initInterruptedDialogOpen,
  usePollingEffect,
} from 'route/measurement/measurementPageState';

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

  useEffect(() => {
    const setters: MeasurementSetters = {
      setIsRunning,
      setCurrentExecutions,
      setCurrentTaskIndex,
      setResults,
    };
    measurementState.results ??= [...getTasks()];
    attachSetters(setters);
    return () => detachSetters();
  }, []);
  const setters: MeasurementSetters = {
    setIsRunning,
    setCurrentExecutions,
    setCurrentTaskIndex,
    setResults,
  };

  usePollingEffect(isRunning, currentTaskIndex, setCurrentExecutions);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) =>
      handleBeforeUnload(event, measurementState.isRunningRef);
    const onUnload = () => handleUnload(measurementState.isRunningRef);

    globalThis.addEventListener('beforeunload', onBeforeUnload);
    globalThis.addEventListener('unload', onUnload);
    return () => {
      globalThis.removeEventListener('beforeunload', onBeforeUnload);
      globalThis.removeEventListener('unload', onUnload);
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
        <InterruptedSessionDialog
          open={interruptedDialogOpen}
          onClose={() => setInterruptedDialogOpen(false)}
        />
        <MeasurementPageHeader />
        <Paper sx={{ p: 3 }}>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            A minimum of one Digital Twin is required for measurements to work.
          </Alert>
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
