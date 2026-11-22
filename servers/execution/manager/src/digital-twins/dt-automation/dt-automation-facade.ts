import {
  BRANCH_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
  DT_DIRECTORY,
  EXECUTION_CHECK_INTERVAL,
  ExecutionStatus,
  GROUP_NAME,
  RUNNER_TAG,
  initDigitalTwin,
  setAccessToken,
  setEnvironmentStore,
  setExecutionHistoryDB,
  setPipelineExecutionDB,
  setSettingsStore,
  setStorageService,
  setUsername,
  stopPipelines,
} from '@into-cps-association/dt-automation';
import type { IExecutionHistory } from '@into-cps-association/dt-automation';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { type Observable, map } from 'rxjs';
import Config from '../../config/config.service.js';
import type { GitlabSettings } from '../../config/gitlab-settings.js';
import {
  ExecutionNotFoundError,
  GitlabFailureError,
} from '../digital-twins.errors.js';
import type { StartExecutionOptions } from '../dto/start-execution.dto.js';
import type {
  DigitalTwinDetails,
  DigitalTwinSummary,
} from '../interfaces/digital-twin.interface.js';
import type { ExecutionRecord } from '../interfaces/execution-record.interface.js';
import ExecutionTracker from './execution-tracker.js';
import InMemoryExecutionHistory from './in-memory-execution-history.js';
import {
  toDigitalTwinDetails,
  toDigitalTwinSummary,
  toExecutionRecord,
} from './mappers.js';
import ReduxStore from './redux-store.js';

type DigitalTwin = Awaited<ReturnType<typeof initDigitalTwin>>;

function lastError(digitalTwin: DigitalTwin): string {
  return digitalTwin.backend.logs.at(-1)?.error?.message ?? 'unknown error';
}

function reasonOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

// dt-automation wraps GitLab's error as the cause of its own.
function gitlabFailure(context: string, error: unknown): GitlabFailureError {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  return new GitlabFailureError(`${context}: ${reasonOf(cause)}`, { cause });
}

async function onGitlab<T>(
  context: string,
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw gitlabFailure(context, error);
  }
}

function registerWithPackage(
  settings: GitlabSettings,
  history: IExecutionHistory,
): void {
  const environment = { AUTH_AUTHORITY: settings.url };
  const packageSettings = {
    GROUP_NAME: settings.group ?? GROUP_NAME,
    DT_DIRECTORY: settings['dt-directory'] ?? DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME:
      settings['common-library-project'] ?? COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG: settings['runner-tag'] ?? RUNNER_TAG,
    BRANCH_NAME: settings.branch ?? BRANCH_NAME,
    loggingEnabled: false,
    remoteLoggingEnabled: false,
  };
  setAccessToken(settings.token);
  setUsername(settings.username);
  setEnvironmentStore({ getState: () => ({ environment }) });
  setSettingsStore({ getState: () => ({ settings: packageSettings }) });
  setStorageService(history);
  setExecutionHistoryDB(history);
  setPipelineExecutionDB(history);
}

async function readDigitalTwin(dtName: string): Promise<DigitalTwinDetails> {
  const digitalTwin = await initDigitalTwin(dtName);
  await Promise.all([
    digitalTwin.getDescriptionFiles(),
    digitalTwin.getConfigFiles(),
    digitalTwin.getLifecycleFiles(),
  ]);
  return toDigitalTwinDetails(digitalTwin);
}

async function startPipeline(
  dtName: string,
  options: StartExecutionOptions,
): Promise<string> {
  const digitalTwin = await initDigitalTwin(dtName);
  const pipelineId = await digitalTwin.execute(
    false,
    options.runnerTag,
    options.branch,
  );
  const executionId = digitalTwin.currentExecutionId;
  // execute() reports its failure in the backend's log, not by throwing.
  if (pipelineId === null || executionId === null) {
    throw new Error(lastError(digitalTwin));
  }
  return executionId;
}

async function cancelPipelines(
  dtName: string,
  executionId: string,
): Promise<void> {
  const digitalTwin = await initDigitalTwin(dtName);
  const result = await stopPipelines(digitalTwin, executionId);
  const failed = digitalTwin.lastExecutionStatus === ExecutionStatus.ERROR;
  if (!result.success || failed) {
    throw new Error(result.error?.message ?? lastError(digitalTwin));
  }
}

@Injectable()
export default class DtAutomationFacade
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DtAutomationFacade.name);

  private readonly settings: GitlabSettings;

  private readonly history = new InMemoryExecutionHistory();

  private readonly store = new ReduxStore();

  private readonly tracker = new ExecutionTracker(
    this.store,
    EXECUTION_CHECK_INTERVAL,
  );

  constructor(@Inject(Config) config: Config) {
    this.settings = config.getGitlab();
  }

  onModuleInit(): void {
    registerWithPackage(this.settings, this.history);
    this.tracker.start();
  }

  onModuleDestroy(): void {
    this.tracker.stop();
  }

  executionChanges(): Observable<ExecutionRecord> {
    return this.tracker.changes().pipe(map(toExecutionRecord));
  }

  async listDigitalTwins(): Promise<DigitalTwinSummary[]> {
    const { digitalTwins, error } = await this.store.listDigitalTwins();
    // dt-automation reports a failed listing of the library assets and a failed
    // listing of the digital twins with the same message. A failed listing of
    // the digital twins leaves the list empty.
    if (error !== null && digitalTwins.length === 0) {
      throw new GitlabFailureError(error);
    }
    if (error !== null) this.logger.warn(error);
    return digitalTwins.map(toDigitalTwinSummary);
  }

  getDigitalTwin(dtName: string): Promise<DigitalTwinDetails> {
    return onGitlab(`Could not read ${dtName} from GitLab`, () =>
      readDigitalTwin(dtName),
    );
  }

  async startExecution(
    dtName: string,
    options: StartExecutionOptions,
  ): Promise<ExecutionRecord> {
    const executionId = await onGitlab(
      `Could not start ${dtName} on GitLab`,
      () => startPipeline(dtName, options),
    );
    return this.reloadExecution(dtName, executionId);
  }

  async stopExecution(
    dtName: string,
    executionId: string,
  ): Promise<ExecutionRecord> {
    await onGitlab(`Could not stop execution ${executionId} of ${dtName}`, () =>
      cancelPipelines(dtName, executionId),
    );
    return this.reloadExecution(dtName, executionId);
  }

  async listExecutions(dtName: string): Promise<ExecutionRecord[]> {
    const entries = await this.history.getByDTName(dtName);
    return entries.map(toExecutionRecord);
  }

  async findExecution(executionId: string): Promise<ExecutionRecord | null> {
    const entry = await this.history.getById(executionId);
    return entry === null ? null : toExecutionRecord(entry);
  }

  // The status check only follows the executions in the Redux store, so the
  // digital twin's history is loaded into it again after a start or a stop.
  private async reloadExecution(
    dtName: string,
    executionId: string,
  ): Promise<ExecutionRecord> {
    await this.store.loadExecutionHistory(dtName);
    const execution = await this.findExecution(executionId);
    if (execution === null) {
      throw new ExecutionNotFoundError(dtName, executionId);
    }
    return execution;
  }
}
