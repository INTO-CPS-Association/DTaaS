import { useEffect } from 'react';
import {
  ExecutionResult,
  getDefaultConfig,
  getTasks,
  measurementState,
} from 'model/backend/gitlab/measure/measurement.execution';
import { mergeExecutionStatus } from 'model/backend/gitlab/measure/measurement.utils';

export function initCurrentExecutions(): ExecutionResult[] {
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

export function initInterruptedDialogOpen(): boolean {
  if (measurementState.restoredAfterRefresh) {
    measurementState.restoredAfterRefresh = false;
    return true;
  }
  return false;
}

export function usePollingEffect(
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
