// GitLab pipeline lifecycle (trigger, poll, cancel, collect results)
/* eslint-disable no-await-in-loop */
import getAuthority from 'src/util/env';
import DigitalTwin from 'src/digitalTwin';
import { BackendInterface } from 'src/interfaces/backendInterfaces';
import createGitlabInstance from 'src/gitlab/gitlabFactory';
import { delay, hasTimedOut } from 'src/gitlab/execution/pipelineCore';
import pollPipelineStatus from 'src/gitlab/execution/pipelinePolling';
import {
  isCanceledStatus,
  isFailureStatus,
} from 'src/gitlab/execution/statusChecking';
import {
  BETWEEN_TRIAL_DELAY,
  PIPELINE_ACCEPTANCE_DELAY,
} from 'src/gitlab/measure/constants';
import {
  MAX_EXECUTION_TIME,
  PIPELINE_POLL_INTERVAL,
} from 'src/gitlab/digitalTwinConfig/constants';
import {
  Configuration,
  ExecutionResult,
  Trial,
  Execution,
  measurementState,
  getStore,
  getDefaultConfig,
} from 'src/gitlab/measure/measurement.execution';

const abortOptions = {
  shouldAbort: () => measurementState.shouldStopPipelines,
};

function showCancellationWarning(pipelineId: number): void {
  getStore().showSnackbar(
    `Pipeline ${pipelineId} could not be cancelled and may still be running.`,
    'warning',
  );
}

function showChildDiscoveryWarning(parentPipelineId: number): void {
  getStore().showSnackbar(
    `Child pipeline for ${parentPipelineId} could not be verified and may still be running.`,
    'warning',
  );
}

function updatePipelineStatus(
  pipelineId: number,
  status: string,
  phase: 'parent' | 'child',
): void {
  const pipeline = measurementState.activePipelines.find(
    (p) => p.pipelineId === pipelineId,
  );
  if (pipeline) {
    pipeline.status = status;
    pipeline.phase = phase;
  }
}

async function cancelPipelineAndChild(
  backend: BackendInterface,
  pipelineId: number,
): Promise<void> {
  const projectId = backend.getProjectId();
  try {
    await backend.api.cancelPipeline(projectId, pipelineId);
  } catch {
    showCancellationWarning(pipelineId);
  }
  const childPipelineId = await getChildPipelineIdForCancellation(
    backend,
    projectId,
    pipelineId,
  );
  await cancelChildPipeline(backend, projectId, childPipelineId);
}

async function getChildPipelineIdForCancellation(
  backend: BackendInterface,
  projectId: ReturnType<BackendInterface['getProjectId']>,
  pipelineId: number,
): Promise<number | null> {
  const knownChildPipelineId = measurementState.activePipelines.find(
    (pipeline) => pipeline.pipelineId === pipelineId,
  )?.childPipelineId;
  if (knownChildPipelineId != null) return knownChildPipelineId;
  try {
    return await backend.getChildPipelineId(projectId, pipelineId);
  } catch {
    showChildDiscoveryWarning(pipelineId);
    return null;
  }
}

async function cancelChildPipeline(
  backend: BackendInterface,
  projectId: ReturnType<BackendInterface['getProjectId']>,
  childPipelineId: number | null,
): Promise<void> {
  if (childPipelineId != null) {
    await backend.api
      .cancelPipeline(projectId, childPipelineId)
      .catch(() => showCancellationWarning(childPipelineId));
  }
}

export async function cancelActivePipelines(): Promise<void> {
  for (const { backend, pipelineId } of measurementState.activePipelines) {
    await cancelPipelineAndChild(backend, pipelineId);
  }
}

async function resolveChildPipelineId(
  backend: BackendInterface,
  parentPipelineId: number,
  startTime: number,
): Promise<number> {
  const projectId = backend.getProjectId();
  for (;;) {
    const childPipelineId = await backend.getChildPipelineId(
      projectId,
      parentPipelineId,
    );
    if (childPipelineId != null) {
      return childPipelineId;
    }
    ensurePipelineCanContinue(parentPipelineId, startTime);
    await delay(PIPELINE_POLL_INTERVAL);
  }
}

function ensurePipelineCanContinue(
  pipelineId: number,
  startTime: number,
): void {
  if (abortOptions.shouldAbort()) {
    throw new Error(`Pipeline ${pipelineId} stopped by user.`);
  }
  if (hasTimedOut(startTime, MAX_EXECUTION_TIME)) {
    throw new Error(`Pipeline ${pipelineId} timed out.`);
  }
}

async function initializeBackend(): Promise<BackendInterface> {
  const username = sessionStorage.getItem('username');
  const oauthToken = sessionStorage.getItem('access_token');
  if (!oauthToken || !username) {
    throw new Error('Not authenticated. Missing access_token or username.');
  }

  const backend = createGitlabInstance(username, oauthToken, getAuthority());
  await backend.init();
  return backend;
}

async function startPipeline(
  digitalTwin: DigitalTwin,
  dtName: string,
  config: Configuration,
): Promise<number> {
  const pipelineId = await digitalTwin.execute(
    true,
    config['Runner tag'],
    config['Branch name'],
  );
  if (!pipelineId) {
    throw new Error(`Failed to start pipeline for ${dtName}.`);
  }
  return pipelineId;
}

async function retryRejectedPipeline(
  digitalTwin: DigitalTwin,
  dtName: string,
  backend: BackendInterface,
  config: Configuration,
  pipelineId: number,
): Promise<number> {
  await delay(PIPELINE_ACCEPTANCE_DELAY);
  const projectId = backend.getProjectId();
  const status = await backend
    .getPipelineStatus(projectId, pipelineId)
    .catch(() => 'pending');
  if (!isFailureStatus(status) && !isCanceledStatus(status)) return pipelineId;
  await backend.api.cancelPipeline(projectId, pipelineId).catch(() => {});
  return startPipeline(digitalTwin, dtName, config);
}

async function consumeStatusGenerator(
  generator: AsyncGenerator<string, string, unknown>,
  pipelineId: number,
  phase: 'parent' | 'child',
): Promise<string> {
  let finalStatus = '';
  for await (const status of generator) {
    updatePipelineStatus(pipelineId, status, phase);
    finalStatus = status;
  }
  return finalStatus;
}

async function executeDigitalTwinPipeline(
  dtName: string,
  backend: BackendInterface,
  config: Configuration,
): Promise<ExecutionResult> {
  const executionIndex = measurementState.currentTrialExecutionIndex;
  measurementState.currentTrialExecutionIndex += 1;

  const digitalTwin = new DigitalTwin(dtName, backend);
  const startedPipelineId = await startPipeline(digitalTwin, dtName, config);
  const pipelineId = await retryRejectedPipeline(
    digitalTwin,
    dtName,
    backend,
    config,
    startedPipelineId,
  );

  measurementState.currentTrialMinPipelineId ??= pipelineId;

  const startTime = Date.now();
  measurementState.activePipelines.push({
    backend,
    pipelineId,
    dtName,
    config,
    status: 'pending',
    phase: 'parent',
    executionIndex,
  });

  const parentGenerator = pollPipelineStatus(
    backend,
    pipelineId,
    startTime,
    abortOptions,
  );

  const pipelineTransitionDelayMs = 250;

  await consumeStatusGenerator(parentGenerator, pipelineId, 'parent');
  await delay(pipelineTransitionDelayMs);

  const childPipelineId = await resolveChildPipelineId(
    backend,
    pipelineId,
    startTime,
  );
  const activePipelineEntry = measurementState.activePipelines.find(
    (pipeline) => pipeline.pipelineId === pipelineId,
  );
  if (activePipelineEntry) {
    activePipelineEntry.childPipelineId = childPipelineId;
  }

  const childGenerator = pollPipelineStatus(
    backend,
    childPipelineId,
    startTime,
    abortOptions,
  );
  const childStatus = await consumeStatusGenerator(
    childGenerator,
    pipelineId,
    'child',
  );

  const result: ExecutionResult = {
    dtName,
    pipelineId,
    status: childStatus,
    config,
    executionIndex,
  };

  measurementState.executionResults.push(result);
  measurementState.activePipelines = measurementState.activePipelines.filter(
    (pipeline) => pipeline.pipelineId !== pipelineId,
  );

  return result;
}

export async function runDigitalTwin(
  dtName: string,
  config?: Partial<Configuration>,
): Promise<ExecutionResult> {
  const usedConfig: Configuration = { ...getDefaultConfig(), ...config };
  const backend = await initializeBackend();
  return executeDigitalTwinPipeline(dtName, backend, usedConfig);
}

export function createTrialFromExecution(
  trialStart: Date,
  executions: ExecutionResult[],
): Trial {
  const hasFailure = executions.some((exec) => isFailureStatus(exec.status));
  return {
    'Time Start': trialStart,
    'Time End': new Date(),
    Execution: executions,
    Status: hasFailure ? 'FAILURE' : 'SUCCESS',
    Error: undefined,
  };
}

function normalizeError(caughtError: unknown): {
  message: string;
  error: Error;
} {
  const message =
    caughtError instanceof Error ? caughtError.message : String(caughtError);
  const error =
    caughtError instanceof Error ? caughtError : new Error(String(caughtError));
  return { message, error };
}

export function createTrialFromError(
  trialStart: Date,
  caughtError: unknown,
  wasStopped: boolean,
): Trial {
  const { message: errorMessage, error } = normalizeError(caughtError);
  const minPipelineId = measurementState.currentTrialMinPipelineId ?? 0;

  const capturedExecutions: ExecutionResult[] = [
    ...measurementState.executionResults.filter(
      (result) =>
        result.pipelineId !== null && result.pipelineId >= minPipelineId,
    ),
    ...measurementState.activePipelines
      .filter((pipeline) => pipeline.pipelineId >= minPipelineId)
      .map((pipeline) => ({
        dtName: pipeline.dtName,
        pipelineId: pipeline.pipelineId,
        status: 'cancelled',
        config: pipeline.config,
      })),
  ];

  return {
    'Time Start': trialStart,
    'Time End': wasStopped ? undefined : new Date(),
    Execution: capturedExecutions,
    Status: wasStopped ? 'STOPPED' : 'FAILURE',
    Error: wasStopped ? undefined : { message: errorMessage, error },
  };
}

function resetTrialState(): void {
  measurementState.executionResults = [];
  measurementState.activePipelines = [];
  measurementState.currentTrialMinPipelineId = null;
  measurementState.currentTrialExecutionIndex = 0;
}

function wasStoppedByUser(caughtError: unknown): boolean {
  const { message } = normalizeError(caughtError);
  return (
    measurementState.shouldStopPipelines || message.includes('stopped by user')
  );
}

async function runStaggeredExecution(
  execution: Execution,
  index: number,
): Promise<ExecutionResult> {
  await delay(index * BETWEEN_TRIAL_DELAY);
  if (measurementState.shouldStopPipelines) {
    throw new Error('Measurement stopped by user');
  }

  return runDigitalTwin(execution.dtName, execution.config);
}

async function runTrialExecutions(
  executions: Execution[],
): Promise<ExecutionResult[]> {
  return Promise.all(
    executions.map((execution, index) =>
      runStaggeredExecution(execution, index),
    ),
  );
}

async function runTrial(executions: Execution[]): Promise<Trial> {
  resetTrialState();
  const trialStart = new Date();

  try {
    const results = await runTrialExecutions(executions);
    return createTrialFromExecution(trialStart, results);
  } catch (caughtError) {
    return createTrialFromError(
      trialStart,
      caughtError,
      wasStoppedByUser(caughtError),
    );
  }
}

async function delayBeforeTrial(trialNumber: number): Promise<void> {
  if (trialNumber > 0) await delay(BETWEEN_TRIAL_DELAY);
}

async function runTrialIteration(
  executions: Execution[],
  trialNumber: number,
  trials: Trial[],
  updateTrials: (trials: Trial[]) => void,
): Promise<void> {
  await delayBeforeTrial(trialNumber);
  trials.push(await runTrial(executions));
  measurementState.executionResults = [];
  updateTrials([...trials]);
}

function shouldRunTrial(trialNumber: number, targetTrials: number): boolean {
  return trialNumber < targetTrials && !measurementState.shouldStopPipelines;
}

async function runTrialLoop(
  executions: Execution[],
  targetTrials: number,
  trials: Trial[],
  updateTrials: (trials: Trial[]) => void,
): Promise<void> {
  for (
    let trialNumber = trials.length;
    shouldRunTrial(trialNumber, targetTrials);
    trialNumber += 1
  ) {
    await runTrialIteration(executions, trialNumber, trials, updateTrials);
  }
}

export async function runTrials(
  executions: Execution[],
  targetTrials: number,
  existingTrials: Trial[],
  updateTrials: (trials: Trial[]) => void,
): Promise<Trial[]> {
  const trials: Trial[] = [...existingTrials];
  await runTrialLoop(executions, targetTrials, trials, updateTrials);
  return trials;
}
