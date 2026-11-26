import type { DtaasExtension } from '../extension/extension.types';
import validateExtension from '../extension/validateExtension';
import { encodingPresetSchema } from '../schema/preset.schema';
import type { DigitalTwinSummary } from '../visualisation/digitalTwin.types';
import fakeHostServices, {
  type FakeHostOptions,
  type FakeHostServices,
} from './fakeHostServices';
import collectMountables from './collectMountables';
import mountOne from './mountOne';
import installSocketGuard from './socketGuard';

export interface ConformanceOptions {
  /** Host passed to `setup()` and every mounted element. */
  readonly host?: FakeHostServices;
  /** Options for the default host when `host` is not given. */
  readonly hostOptions?: FakeHostOptions;
  /** The twin passed to digital twin tabs. */
  readonly dt?: DigitalTwinSummary;
  /** How long each element may take to finish lazy loading. */
  readonly timeoutMs?: number;
}

export interface ConformanceReport {
  readonly passed: boolean;
  readonly errors: string[];
}

const SAMPLE_DT: DigitalTwinSummary = {
  name: 'sample',
  path: 'digital_twins/sample',
  files: [],
};

const presetErrors = (ext: DtaasExtension): string[] =>
  (ext.visualisation?.presets ?? []).flatMap((preset, i) => {
    const result = encodingPresetSchema.safeParse(preset);
    return result.success
      ? []
      : result.error.issues.map(
          (issue) =>
            `visualisation.presets[${i}] "${preset.id}": ${issue.path.join('.')}: ${issue.message}`,
        );
  });

const setupErrors = async (ext: DtaasExtension, host: FakeHostServices) => {
  try {
    await ext.setup?.(host);
    return [];
  } catch (error) {
    return [
      `setup() failed: ${error instanceof Error ? error.message : String(error)}`,
    ];
  }
};

/** One element at a time, so each error is attributable to its element. */
const mountSequentially = (
  ext: DtaasExtension,
  host: FakeHostServices,
  options: ConformanceOptions,
) =>
  collectMountables(ext, options.dt ?? SAMPLE_DT).reduce<Promise<string[]>>(
    async (previous, mountable) => [
      ...(await previous),
      ...(await mountOne(host, mountable, options.timeoutMs ?? 2000)),
    ],
    Promise.resolve([]),
  );

const runtimeErrors = async (
  ext: DtaasExtension,
  options: ConformanceOptions,
) => {
  const host =
    options.host ??
    fakeHostServices({ extensionId: ext.id, ...options.hostOptions });
  const guard = installSocketGuard();
  const errors: string[] = [];
  try {
    const setup = await setupErrors(ext, host);
    errors.push(...setup, ...(await mountSequentially(ext, host, options)));
  } finally {
    guard.restore();
  }
  const sockets = guard.attempts.map(
    (url) => `opened a socket to ${url}; use HostServices.signals instead`,
  );
  return [...errors, ...sockets];
};

const LOADER_LISTS = ['converters', 'fieldKernels', 'substrates'] as const;

const isThenable = (value: unknown): boolean =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  typeof (value as { then?: unknown }).then === 'function';

/**
 * `validateExtension` can only see that a `load` takes no argument, which
 * `() => new HeavyAdapter()` passes as well. Calling each loader shows whether
 * it returns a promise, as `() => import('./adapter')` does. The promises are
 * awaited so that no module loads after the test ends, and a rejection is not
 * reported, because the module may need a browser the test does not have.
 */
const loaderErrors = async (ext: DtaasExtension): Promise<string[]> => {
  const pending: Promise<unknown>[] = [];
  const errors = LOADER_LISTS.flatMap((list) =>
    (ext.visualisation?.[list] ?? []).flatMap((entry, i) => {
      const loaded: unknown = entry.load();
      if (isThenable(loaded)) {
        pending.push(Promise.resolve(loaded).catch(() => undefined));
        return [];
      }
      return [
        `visualisation.${list}[${i}] "${entry.id}": load must return a promise, such as import()`,
      ];
    }),
  );
  await Promise.all(pending);
  return errors;
};

/**
 * Proves an extension satisfies the contract without cloning DTaaS: static
 * validation, preset schemas, lazy loaders, `setup()`, mounting every page,
 * and no sockets.
 */
const checkConformance = async (
  ext: DtaasExtension,
  options: ConformanceOptions = {},
): Promise<ConformanceReport> => {
  const { errors: validation } = validateExtension(ext);
  if (validation.length > 0) return { passed: false, errors: validation };
  const errors = [
    ...presetErrors(ext),
    ...(await loaderErrors(ext)),
    ...(await runtimeErrors(ext, options)),
  ];
  return { passed: errors.length === 0, errors };
};

export default checkConformance;
