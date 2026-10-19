/**
 * What this client gives an extension: the `HostServices` of the SDK.
 *
 * One set is shared by every extension (user, library, workspace files,
 * GitLab, snackbar, page frame, settings). `servicesFor` then adds what is
 * per extension: a logger that names it, and `config()`, which reads only its
 * own `REACT_APP_EXT_<ID>_*` keys from `env.js`. An extension reaches nothing
 * else of the client, which is the boundary the SDK's ESLint rules enforce on
 * the extension's side.
 */

import {
  readExtensionConfig,
  type EnvRecord,
  type HostServices,
  type LibraryService,
  type SnackbarSeverity,
} from '@into-cps-association/dtaas-sdk';
import PageShell from 'components/PageShell';
import {
  cleanUsername,
  libraryURLFor,
  useURLforLIB,
  useUsername,
} from 'util/envUtil';
import createContentsService, { workspaceUrl } from 'extension/contentsClient';
import createGitService from 'extension/gitClient';

/** The parts of the client store the services read and write. */
export interface HostStore {
  getState(): {
    auth: { userName?: string };
    settings: object;
  };
  notify(message: string, severity: SnackbarSeverity): void;
}

export type SharedServices = Omit<HostServices, 'config' | 'logger'>;

/** The services the common core provides, which the host only passes on. */
export type CoreServices = Pick<HostServices, 'signals' | 'viz'>;

async function userName(store: HostStore): Promise<string> {
  const name = cleanUsername(store.getState().auth.userName);
  if (!name) throw new Error('No user is signed in');
  return name;
}

/**
 * The library folders DTaaS keeps by convention. Building models live in the
 * shared `common` library, so every user of a twin sees the same ones, and a
 * visualisation.json sits in the folder of the twin it draws.
 */
const CONVENTIONS = {
  modelsDirectory: 'common/models',
  digitalTwinsDirectory: 'digital_twins',
  visualisationsDirectory: 'digital_twins',
};

/**
 * `lib://<path>` is a file of the user's library, and a web address passes
 * through. Anything else is refused instead of guessed.
 */
function resolver(baseUrl: () => Promise<string>) {
  return async (url: string) => {
    if (url.startsWith('lib://')) {
      return workspaceUrl(await baseUrl(), 'files', url.slice(6));
    }
    if (/^https?:\/\//.test(url)) return url;
    throw new Error(`${url} is not a lib:// or web address`);
  };
}

function library(store: HostStore): LibraryService {
  const baseUrl = async () => libraryURLFor(await userName(store));
  return {
    baseUrl,
    useBaseUrl: () => {
      const url = useURLforLIB();
      return useUsername() ? url : null;
    },
    conventions: CONVENTIONS,
    resolve: resolver(baseUrl),
  };
}

/** The platform half of the shared services, before the core joins them. */
export function createPlatformServices(
  store: HostStore,
): Omit<SharedServices, keyof CoreServices> {
  const lib = library(store);
  return {
    auth: {
      user: async () => ({ username: await userName(store) }),
      useUser: () => {
        const username = useUsername();
        return username ? { username } : null;
      },
    },
    library: lib,
    contents: createContentsService(lib.baseUrl),
    git: createGitService(),
    ui: { snackbar: store.notify, Page: PageShell },
    // Settings are read by name, so the typed slice is read as a record.
    settings: {
      get: <T>(key: string) =>
        (store.getState().settings as Record<string, unknown>)[key] as
          T | undefined,
    },
  };
}

export function createSharedServices(
  store: HostStore,
  core: CoreServices,
): SharedServices {
  return { ...createPlatformServices(store), ...core };
}

/**
 * The services of one extension, by its id: the shared set, a logger that
 * names it, and its config.
 */
export function servicesFor(
  id: string,
  shared: SharedServices,
  env: EnvRecord,
): HostServices {
  const tag = `[${id}]`;
  return {
    ...shared,
    // The browser console is where a developer looks for an extension's
    // output, and the tag says which extension wrote it.
    /* eslint-disable no-console */
    logger: {
      debug: (...args) => console.debug(tag, ...args),
      info: (...args) => console.info(tag, ...args),
      warn: (...args) => console.warn(tag, ...args),
      error: (...args) => console.error(tag, ...args),
    },
    /* eslint-enable no-console */
    config: (schema) => {
      const result = readExtensionConfig(id, schema, env);
      if (!result.success) throw result.error;
      return result.data;
    },
  };
}
