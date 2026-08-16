// Pure utility helpers (status checks, time calculations, result formatting)
import {
  TimedTask,
  Status,
  ExecutionResult,
  ActivePipeline,
  Execution,
  Configuration,
} from 'model/backend/gitlab/measure/measurement.execution';

export function isTaskComplete(item: { Status: Status }): boolean {
  return item.Status === 'SUCCESS' || item.Status === 'FAILURE';
}

export function areAllMeasurementsComplete(taskResults: TimedTask[]): boolean {
  if (taskResults.length === 0) return false;
  const hasNoStopped = !taskResults.some((task) => task.Status === 'STOPPED');
  const allTasksComplete = taskResults.every(isTaskComplete);
  return hasNoStopped && allTasksComplete;
}

export function getRunnerTags(
  task: TimedTask,
  primaryRunnerTag: string,
  secondaryRunnerTag: string,
): {
  primaryTag: string | null;
  secondaryTag: string | null;
} {
  const executions = task.Executions?.() ?? [];
  const usesMultipleRunners = executions.some((e) => 'Runner tag' in e.config);

  return {
    primaryTag: primaryRunnerTag,
    secondaryTag: usesMultipleRunners ? secondaryRunnerTag || null : null,
  };
}

function round3(value: number | undefined | null): number | undefined | null {
  return value == null ? value : Number.parseFloat(value.toFixed(3));
}

export function secondsDifference(
  startTime: Date | undefined,
  endTime: Date | undefined,
): number | undefined {
  if (!startTime || !endTime) return undefined;
  return (endTime.getTime() - startTime.getTime()) / 1000;
}

export function getTotalTime(results: TimedTask[]): number | null {
  const startTimes = results
    .map((task) => task['Time Start'])
    .filter((x): x is Date => x != null);
  const endTimes = results
    .map((task) => task['Time End'])
    .filter((x): x is Date => x != null);

  if (startTimes.length === 0 || endTimes.length === 0) {
    return null;
  }

  const firstStart = Math.min(
    ...startTimes.map((duration) => duration.getTime()),
  );
  const lastEnd = Math.max(...endTimes.map((duration) => duration.getTime()));

  return round3((lastEnd - firstStart) / 1000) as number;
}

function timestampSlug(): string {
  return new Date().toISOString().slice(0, 19).split(':').join('-');
}

function triggerJsonDownload(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function serializeTask(task: TimedTask) {
  const firstExecution = task.Trials[0]?.Execution[0];
  const { 'Runner tag': _runnerTag, ...config } = firstExecution
    ? { ...firstExecution.config }
    : ({} as Record<string, string>);

  return {
    'Task Name': task['Task Name'],
    Description: task.Description,
    config,
    trials: task.Trials.map((trial) => ({
      'Time Start': trial['Time Start'],
      'Time End': trial['Time End'],
      Status: trial.Status,
      ...(trial.Error ? { Error: trial.Error } : {}),
      executions: trial.Execution.map(
        ({ dtName, pipelineId, status, config: execConfig }) => ({
          dtName,
          pipelineId,
          status,
          'Runner tag': execConfig['Runner tag'],
        }),
      ),
    })),
    'Time Start': task['Time Start'],
    'Time End': task['Time End'],
    'Average Time (s)': task['Average Time (s)'],
    Status: task.Status,
  };
}

export function downloadResultsJson(results: TimedTask[]): void {
  const data = {
    totalTimeSeconds: getTotalTime(results),
    tasks: results.map(serializeTask),
  };
  triggerJsonDownload(data, `measurement-${timestampSlug()}.json`);
}

export function downloadTaskResultJson(task: TimedTask): void {
  const data = {
    totalTimeSeconds: round3(
      secondsDifference(task['Time Start'], task['Time End']),
    ),
    task: serializeTask(task),
  };
  const taskNameSlug = task['Task Name'].toLowerCase().split(/\s+/).join('-');
  triggerJsonDownload(
    data,
    `measurement-${taskNameSlug}-${timestampSlug()}.json`,
  );
}

export function computeAverageTime(
  trials: TimedTask['Trials'],
): number | undefined {
  const durations = trials
    .map((trial) => secondsDifference(trial['Time Start'], trial['Time End']))
    .filter((duration): duration is number => duration != null);

  return durations.length > 0
    ? (round3(
        durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length,
      ) as number)
    : undefined;
}

export function computeFinalStatus(
  trials: TimedTask['Trials'],
  expectedTrialCount: number,
  wasStopped: boolean,
): Status {
  const hasAnyStopped = trials.some((trial) => trial.Status === 'STOPPED');

  if (wasStopped && trials.length < expectedTrialCount) {
    return 'STOPPED';
  }
  if (hasAnyStopped) {
    return 'STOPPED';
  }

  const hasAnyFailures = trials.some((trial) => trial.Status === 'FAILURE');
  return hasAnyFailures ? 'FAILURE' : 'SUCCESS';
}

export function getMeasurementStatus(results: TimedTask[]): {
  hasStarted: boolean;
  completedTasks: number;
  completedTrials: number;
  totalTasks: number;
} {
  const hasStarted = results.some(
    (task) => task.Status !== 'NOT_STARTED' && task.Status !== 'PENDING',
  );
  const completedTasks = results.filter(
    (task) => task.Status === 'SUCCESS' || task.Status === 'FAILURE',
  ).length;
  const completedTrials = results.reduce(
    (sum, task) =>
      sum +
      task.Trials.filter(
        (trial) => trial.Status === 'SUCCESS' || trial.Status === 'FAILURE',
      ).length,
    0,
  );
  const totalTasks = results.length;

  return { hasStarted, completedTasks, completedTrials, totalTasks };
}

const pipelineStatusMap: Record<string, string> = {
  pending: 'starting',
  created: 'starting',
  preparing: 'preparing',
  running: 'running',
  success: 'successful',
  failed: 'failed',
  canceled: 'cancelled',
  skipped: 'skipped',
};

function formatPipelineExecution(
  pipeline: ActivePipeline,
  executionIndex?: number,
): ExecutionResult {
  const phaseName = pipeline.phase === 'parent' ? 'Parent' : 'Child';
  const statusText = pipelineStatusMap[pipeline.status] ?? pipeline.status;
  return {
    dtName: pipeline.dtName,
    pipelineId: pipeline.pipelineId,
    status: `${phaseName} pipeline ${statusText}`,
    config: pipeline.config,
    executionIndex,
  };
}

function mergeRunningOnly(
  activePipelines: ActivePipeline[],
  completedResults: ExecutionResult[],
): ExecutionResult[] {
  const completedIds = new Set(completedResults.map((r) => r.pipelineId));
  return [
    ...completedResults,
    ...activePipelines
      .filter((p) => !completedIds.has(p.pipelineId))
      .map((p) => formatPipelineExecution(p)),
  ];
}

export function mergeExecutionStatus(
  executions: Execution[],
  activePipelines: ActivePipeline[],
  completedResults: ExecutionResult[],
  defaultConfig: Configuration,
): ExecutionResult[] {
  if (executions.length === 0) {
    return mergeRunningOnly(activePipelines, completedResults);
  }

  return executions.map((expected, i) => {
    const completed = completedResults.find((r) => r.executionIndex === i);
    if (completed) return completed;
    const active = activePipelines.find((p) => p.executionIndex === i);
    if (active) return formatPipelineExecution(active, i);
    return {
      dtName: expected.dtName,
      pipelineId: null,
      status: '—',
      config: { ...defaultConfig, ...expected.config },
      executionIndex: i,
    };
  });
}
