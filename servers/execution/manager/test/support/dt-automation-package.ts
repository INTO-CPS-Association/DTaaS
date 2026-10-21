import { jest } from '@jest/globals';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';
import { gitlabConfig } from './gitlab-settings.js';

// The package with the calls that reach GitLab replaced. A test file that
// imports this module gets the facade with these replacements.
export const actual = await import('@into-cps-association/dt-automation');
export const fetchDigitalTwins = jest.fn<typeof actual.fetchDigitalTwins>();
export const initDigitalTwin = jest.fn<typeof actual.initDigitalTwin>();
export const stopPipelines = jest.fn<typeof actual.stopPipelines>();
const setExecutionHistoryDB = jest.fn<typeof actual.setExecutionHistoryDB>();
const setSettingsStore = jest.fn<typeof actual.setSettingsStore>();
jest.unstable_mockModule('@into-cps-association/dt-automation', () => ({
  ...actual,
  fetchDigitalTwins,
  initDigitalTwin,
  stopPipelines,
  setExecutionHistoryDB,
  setSettingsStore,
}));

const { default: DtAutomationFacade } =
  await import('src/digital-twins/dt-automation/dt-automation-facade.js');

type DigitalTwin = Awaited<ReturnType<typeof actual.initDigitalTwin>>;
type LogEntry = DigitalTwin['backend']['logs'][number];
export type History = Parameters<typeof actual.setExecutionHistoryDB>[0];
export type Facade = InstanceType<typeof DtAutomationFacade>;

export const running = {
  id: 'e-1',
  dtName: 'hello-world',
  pipelineId: 42,
  timestamp: 1,
  status: actual.ExecutionStatus.RUNNING,
  jobLogs: [],
};

export const runningRecord: ExecutionRecord = { ...running, status: 'running' };

export function resetPackage(): void {
  jest.resetAllMocks();
  setExecutionHistoryDB.mockImplementation(actual.setExecutionHistoryDB);
  setSettingsStore.mockImplementation(actual.setSettingsStore);
}

/** Starts a facade and returns it with the history it gave the package. */
export function startFacade(env: Record<string, string> = {}) {
  const facade = new DtAutomationFacade(gitlabConfig(env));
  facade.onModuleInit();
  const history = setExecutionHistoryDB.mock.calls.at(-1)?.[0] as History;
  return { facade, history };
}

export function packageSettings() {
  return setSettingsStore.mock.calls.at(-1)?.[0].getState().settings;
}

export function gitlabRefusal(): Error {
  return new Error('Failed to initialize DigitalTwin', {
    cause: new Error('401 Unauthorized'),
  });
}

export function failureLog(message: string): LogEntry {
  return {
    status: 'error',
    DTName: 'hello-world',
    runnerTag: 'linux',
    error: new Error(message),
  };
}

export function gitlabLists(error: string | null, ...names: string[]): void {
  fetchDigitalTwins.mockImplementationOnce(async (dispatch, setError) => {
    for (const name of names) {
      const digitalTwin = {
        DTName: name,
        description: `About ${name}`,
        fullDescription: `# ${name}`,
        jobLogs: [],
        pipelineCompleted: false,
        pipelineLoading: false,
      };
      dispatch(actual.setDigitalTwin({ assetName: name, digitalTwin }));
    }
    setError(error);
  });
}

function fakeDigitalTwin() {
  const digitalTwin = {
    DTName: 'hello-world',
    description: 'Says hello' as string | undefined,
    fullDescription: '# hello-world',
    descriptionFiles: [] as string[],
    configFiles: [] as string[],
    lifecycleFiles: [] as string[],
    currentExecutionId: null as string | null,
    lastExecutionStatus: null as DigitalTwin['lastExecutionStatus'],
    backend: { logs: [] as LogEntry[] },
    execute: jest.fn<DigitalTwin['execute']>(),
    getDescriptionFiles: jest.fn(async () => {
      digitalTwin.descriptionFiles = ['description.md', 'README.md'];
    }),
    getConfigFiles: jest.fn(async () => {
      digitalTwin.configFiles = ['config.json'];
    }),
    getLifecycleFiles: jest.fn(async () => {
      digitalTwin.lifecycleFiles = ['execute', 'terminate'];
    }),
  };
  return digitalTwin;
}

/** A digital twin whose start and stop write the history as the package does. */
export function digitalTwinOnGitlab(history: History) {
  const digitalTwin = fakeDigitalTwin();
  let started = 0;
  digitalTwin.execute.mockImplementation(async () => {
    started += 1;
    const pipelineId = running.pipelineId + started - 1;
    digitalTwin.currentExecutionId = `e-${started}`;
    await history.add({ ...running, id: `e-${started}`, pipelineId });
    return pipelineId;
  });
  initDigitalTwin.mockResolvedValue(digitalTwin as unknown as DigitalTwin);
  stopPipelines.mockImplementation(async (_digitalTwin, executionId) => {
    const entry = await history.getById(executionId as string);
    const status = actual.ExecutionStatus.CANCELED;
    if (entry !== null) await history.update({ ...entry, status });
    return { success: true };
  });
  return digitalTwin;
}
