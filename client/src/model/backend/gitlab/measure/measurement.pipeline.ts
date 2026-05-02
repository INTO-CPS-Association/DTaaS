// GitLab pipeline lifecycle (trigger, poll, cancel, collect results)
/* eslint-disable no-await-in-loop */
import { getAuthority } from 'util/envUtil';
import DigitalTwin from 'model/backend/digitalTwin';
import { BackendInterface } from 'model/backend/interfaces/backendInterfaces';
import createGitlabInstance from 'model/backend/gitlab/gitlabFactory';
import {
  delay,
  getChildPipelineId,
} from 'model/backend/gitlab/execution/pipelineCore';
import { pollPipelineStatus } from 'model/backend/gitlab/execution/pipelinePolling';
import { isFailureStatus } from 'model/backend/gitlab/execution/statusChecking';
import { BETWEEN_TRIAL_DELAY } from 'model/backend/gitlab/measure/constants';
import {
  Configuration,
  ExecutionResult,
  Trial,
  Execution,
  measurementState,
  getDefaultConfig,
} from 'model/backend/gitlab/measure/measurement.execution';

const abortOptions = {
  shouldAbort: () => measurementState.shouldStopPipelines,
};

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

export async function cancelActivePipelines(): Promise<void> {
  for (const { backend, pipelineId } of measurementState.activePipelines) {
    try {
      const projectId = backend.getProjectId();
      await backend.api.cancelPipeline(projectId, pipelineId);
      await backend.api
        .cancelPipeline(projectId, getChildPipelineId(pipelineId))
        .catch(() => {});
    } catch {
      // continue with others
    }
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
  const pipelineId = await digitalTwin.execute(
    true,
    config['Runner tag'],
    config['Branch name'],
  );

  if (!pipelineId) {
    throw new Error(`Failed to start pipeline for ${dtName}.`);
  }

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

  const childPipelineId = getChildPipelineId(pipelineId);
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

export async function runTrials(
  executions: Execution[],
  targetTrials: number,
  existingTrials: Trial[],
  updateTrials: (trials: Trial[]) => void,
): Promise<Trial[]> {
  const trials: Trial[] = [...existingTrials];
  const startTrialNumber = existingTrials.length;

  for (
    let trialNumber = startTrialNumber;
    trialNumber < targetTrials;
    trialNumber += 1
  ) {
    if (measurementState.shouldStopPipelines) break;
    if (trialNumber > 0) await delay(BETWEEN_TRIAL_DELAY);

    measurementState.executionResults = [];
    measurementState.activePipelines = [];
    measurementState.currentTrialMinPipelineId = null;
    measurementState.currentTrialExecutionIndex = 0;
    const trialStart = new Date();

    try {
      const promises = executions.map(({ dtName, config }, i) =>
        delay(i * BETWEEN_TRIAL_DELAY).then(() => {
          if (measurementState.shouldStopPipelines) {
            throw new Error('Measurement stopped by user');
          }
          return runDigitalTwin(dtName, config);
        }),
      );
      const results = await Promise.all(promises);
      trials.push(createTrialFromExecution(trialStart, results));
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError);
      const wasStopped =
        measurementState.shouldStopPipelines ||
        errorMessage.includes('stopped by user');
      trials.push(createTrialFromError(trialStart, caughtError, wasStopped));
    }

    measurementState.executionResults = [];
    updateTrials([...trials]);
  }

  return trials;
}
