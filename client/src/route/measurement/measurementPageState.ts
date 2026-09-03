import { useEffect } from 'react';
import {
  ExecutionResult,
  getDefaultConfig,
  getTasks,
  measurementState,
  mergeExecutionStatus,
} from '@into-cps-association/dt-automation';

function computeExecutionsForTask(taskIndex: number | null): ExecutionResult[] {
  if (taskIndex === null) return [];
  const task = getTasks()[taskIndex];
  const executions = task?.Executions?.() ?? [];
  return mergeExecutionStatus(
    executions,
    measurementState.activePipelines,
    measurementState.executionResults,
    getDefaultConfig(),
  );
}

export function initCurrentExecutions(): ExecutionResult[] {
  if (!measurementState.isRunning) return [];
  return computeExecutionsForTask(measurementState.currentTaskIndexUI);
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
      setCurrentExecutions(computeExecutionsForTask(currentTaskIndex));
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, currentTaskIndex, setCurrentExecutions]);
}
