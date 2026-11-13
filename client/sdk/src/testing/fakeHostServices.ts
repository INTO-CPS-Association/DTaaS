import type { ZodType } from 'zod';
import {
  type EnvRecord,
  readExtensionConfig,
} from '../extension/extensionConfig';
import type { HostServices } from '../host/hostServices.types';
import type {
  LibraryService,
  Logger,
  SnackbarSeverity,
  User,
} from '../host/platform.types';
import type { TbEntity } from '../visualisation/digitalTwin.types';
import FakePage from './FakePage';
import createFakeSignals, { type FakeSignals } from './fakeSignals';
import createFakeViz, {
  type FakeVizOptions,
  type RecordedSave,
} from './fakeViz';
import createMemoryContents, { type MemoryContents } from './memoryContents';
import createMemoryGit, { type GitRecord } from './memoryGit';

export interface FakeHostOptions {
  /** Whose `REACT_APP_EXT_<ID>_*` keys `config()` reads. Default `test`. */
  readonly extensionId?: string;
  readonly env?: EnvRecord;
  /** The signed-in user; `null` for signed out. Default `{ username: 'user' }`. */
  readonly user?: User | null;
  readonly baseUrl?: string;
  readonly now?: () => number;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly files?: Record<string, Uint8Array | string>;
  readonly entities?: readonly TbEntity[];
  readonly viz?: FakeVizOptions;
  /** Services of other extensions `extensions.get` returns, by id. */
  readonly services?: Readonly<Record<string, unknown>>;
  /** Replace whole services, e.g. with jest mocks. */
  readonly overrides?: Partial<HostServices>;
}

type LogLevel = keyof Logger;

export interface Recorded extends GitRecord {
  readonly snackbars: { message: string; severity: SnackbarSeverity }[];
  readonly logs: { level: LogLevel; args: unknown[] }[];
  readonly savedAssets: RecordedSave[];
}

export interface FakeHostServices extends HostServices {
  readonly signals: FakeSignals;
  readonly contents: MemoryContents;
  readonly recorded: Recorded;
}

const createLibrary = (baseUrl: string): LibraryService => ({
  baseUrl: async () => baseUrl,
  useBaseUrl: () => baseUrl,
  conventions: {
    modelsDirectory: 'common/models',
    digitalTwinsDirectory: 'digital_twins',
    visualisationsDirectory: 'common/visualisations',
  },
  resolve: async (url) =>
    url.startsWith('lib://') ? `${baseUrl}/${url.slice(6)}` : url,
});

const createLogger = (recorded: Recorded): Logger => {
  const log =
    (level: LogLevel) =>
    (...args: unknown[]) =>
      recorded.logs.push({ level, args });
  return {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
};

const createConfig =
  (id: string, env: EnvRecord) =>
  <T>(schema: ZodType<T>): T => {
    const result = readExtensionConfig(id, schema, env);
    if (result.success) return result.data;
    throw new Error(
      `Invalid configuration for extension "${id}": ${result.error.message}`,
    );
  };

const createAuth = (user: User | null) => ({
  useUser: () => user,
  user: async () => {
    if (!user) throw new Error('Not signed in');
    return user;
  },
});

const createRecorded = (): Recorded => ({
  snackbars: [],
  logs: [],
  commits: [],
  mergeRequests: [],
  savedAssets: [],
});

const createUi = (recorded: Recorded) => ({
  Page: FakePage,
  snackbar: (message: string, severity: SnackbarSeverity) => {
    recorded.snackbars.push({ message, severity });
  },
});

const createSettings = (settings: Readonly<Record<string, unknown>> = {}) => ({
  get: <T>(key: string) => settings[key] as T | undefined,
});

const createExtensionServices = (
  services: Readonly<Record<string, unknown>> = {},
) => ({
  get: <T>(id: string): T => {
    if (!(id in services)) throw new Error(`No service ${id} in this host`);
    return services[id] as T;
  },
});

/** A complete, in-memory `HostServices` for testing a kit without DTaaS. */
const fakeHostServices = (options: FakeHostOptions = {}): FakeHostServices => {
  const recorded = createRecorded();
  const user = options.user === undefined ? { username: 'user' } : options.user;
  const { now, entities } = options;
  return {
    auth: createAuth(user),
    library: createLibrary(options.baseUrl ?? 'https://dtaas.example/lib'),
    contents: createMemoryContents(options.files),
    git: createMemoryGit(recorded),
    signals: createFakeSignals({ now, entities }),
    viz: createFakeViz(options.viz, recorded.savedAssets),
    ui: createUi(recorded),
    logger: createLogger(recorded),
    settings: createSettings(options.settings),
    extensions: createExtensionServices(options.services),
    config: createConfig(options.extensionId ?? 'test', options.env ?? {}),
    recorded,
    ...options.overrides,
  } as FakeHostServices;
};

export default fakeHostServices;
