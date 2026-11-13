/**
 * The extension registry: which compiled-in extensions run, and what each adds.
 *
 * `src/extensions.ts` lists every domain extension built into this client.
 * This function decides which of them are enabled and merges what they
 * contribute. It is pure, so every rule is tested without rendering a page.
 *
 * An extension is left out, with the reason recorded in `problems`, when:
 *
 * - `validateExtension` from the SDK finds it malformed (an eager page, a bad
 *   id, a navigation path outside its own prefix and the other rules there).
 * - Its id is taken by a core route of this client or by an earlier extension.
 * - A deployment lists it in `REACT_APP_EXTENSIONS_DISABLED` in `env.js`.
 * - Its own `REACT_APP_EXT_<ID>_*` keys do not satisfy its config schema.
 * - It registers an anchor kind, a preset or a substrate that another
 *   extension already registered. Rules that span extensions belong to the
 *   host, since `validateExtension` sees one extension at a time.
 * - It requires a service that no enabled extension provides.
 */

import {
  RESERVED_EXTENSION_IDS,
  type AssetPreview,
  isExtensionDisabled,
  readExtensionConfig,
  validateExtension,
  type DigitalTwinTab,
  type DtaasExtension,
  type EnvRecord,
  type ExtensionReducer,
  type ExtensionRoute,
  type NavigationItem,
} from '@into-cps-association/dtaas-sdk';

/**
 * Core routes of this client. The SDK's default list names every one, and a
 * client route added later joins this list.
 */
export const CORE_ROUTE_IDS: readonly string[] = [...RESERVED_EXTENSION_IDS];

export interface ExtensionProblem {
  readonly id: string;
  readonly reason: string;
}

export interface MountedRoute {
  readonly extension: DtaasExtension;
  /** Router path, relative to the application root. */
  readonly path: string;
  readonly element: ExtensionRoute['element'];
}

export interface MountedTab {
  readonly extension: DtaasExtension;
  readonly tab: DigitalTwinTab;
}

export interface MountedPreview {
  readonly extension: DtaasExtension;
  readonly preview: AssetPreview;
}

export interface ExtensionHost {
  readonly enabled: readonly DtaasExtension[];
  readonly routes: readonly MountedRoute[];
  readonly navigation: readonly NavigationItem[];
  readonly digitalTwinTabs: readonly MountedTab[];
  readonly assetPreviews: readonly MountedPreview[];
  readonly reducers: Readonly<Record<string, ExtensionReducer<unknown>>>;
  readonly problems: readonly ExtensionProblem[];
}

/** Keys an extension claims in the shared registries, by registry name. */
function claimedKeys(ext: DtaasExtension): Record<string, readonly string[]> {
  const viz = ext.visualisation;
  return {
    'anchor kind': (viz?.anchorKinds ?? []).map((spec) => spec.kind),
    preset: (viz?.presets ?? []).map((preset) => preset.id),
    substrate: (viz?.substrates ?? []).map((spec) => spec.id),
  };
}

/** A clash with keys already claimed, or undefined when there is none. */
function sharedKeyClash(
  ext: DtaasExtension,
  claimed: Map<string, string>,
): string | undefined {
  for (const [registry, keys] of Object.entries(claimedKeys(ext))) {
    const taken = keys.find((key) => claimed.has(`${registry}:${key}`));
    if (taken !== undefined) {
      const owner = claimed.get(`${registry}:${taken}`);
      return `${registry} ${taken} is already registered by ${owner}`;
    }
  }
  return undefined;
}

function claim(ext: DtaasExtension, claimed: Map<string, string>): void {
  for (const [registry, keys] of Object.entries(claimedKeys(ext))) {
    keys.forEach((key) => claimed.set(`${registry}:${key}`, ext.id));
  }
}

/** Why one extension cannot run, or undefined when it can. */
function rejection(
  ext: DtaasExtension,
  env: EnvRecord,
  seen: ReadonlySet<string>,
  claimed: Map<string, string>,
): string | undefined {
  const { valid, errors } = validateExtension(ext, {
    reservedIds: CORE_ROUTE_IDS,
  });
  if (!valid) return errors.join('; ');
  if (seen.has(ext.id)) return 'another extension already has this id';
  if (isExtensionDisabled(ext.id, env)) {
    return 'disabled by REACT_APP_EXTENSIONS_DISABLED';
  }
  if (ext.config) {
    const config = readExtensionConfig(ext.id, ext.config.schema, env);
    if (!config.success) return `invalid config: ${config.error.message}`;
  }
  return sharedKeyClash(ext, claimed);
}

/** The router path of one extension route, under the extension's id. */
export function mountPath(id: string, routePath: string): string {
  return routePath === '' ? `${id}/*` : `${id}/${routePath}`;
}

function mount(enabled: readonly DtaasExtension[]) {
  return {
    routes: enabled.flatMap((extension) =>
      (extension.routes ?? []).map((route) => ({
        extension,
        path: mountPath(extension.id, route.path),
        element: route.element,
      })),
    ),
    navigation: enabled
      .flatMap((extension) => extension.navigation ?? [])
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    digitalTwinTabs: enabled.flatMap((extension) =>
      (extension.digitalTwinTabs ?? []).map((tab) => ({ extension, tab })),
    ),
    assetPreviews: enabled.flatMap((extension) =>
      (extension.assetPreviews ?? []).map((preview) => ({
        extension,
        preview,
      })),
    ),
    reducers: Object.fromEntries(
      enabled.flatMap((extension) =>
        extension.reducer ? [[extension.id, extension.reducer]] : [],
      ),
    ),
  };
}

/** The first service in `requires` that no extension in `enabled` provides. */
function missingService(
  ext: DtaasExtension,
  enabled: readonly DtaasExtension[],
): string | undefined {
  const provided = new Set(
    enabled.flatMap((other) => (other.provides ?? []).map(({ id }) => id)),
  );
  return (ext.requires ?? []).find((id) => !provided.has(id));
}

/**
 * Leave out every extension whose required service is missing. Leaving one
 * out can take away a service another needs, so this repeats until none is.
 */
function withRequirementsMet(
  enabled: DtaasExtension[],
  problems: ExtensionProblem[],
): DtaasExtension[] {
  const unmet = enabled.find((ext) => missingService(ext, enabled));
  if (!unmet) return enabled;
  const id = missingService(unmet, enabled);
  problems.push({
    id: unmet.id,
    reason: `requires service ${id}, which no enabled extension provides`,
  });
  return withRequirementsMet(
    enabled.filter((ext) => ext !== unmet),
    problems,
  );
}

/** The extensions that pass every check but requirements, in order. */
function admit(
  extensions: readonly DtaasExtension[],
  env: EnvRecord,
): { enabled: DtaasExtension[]; problems: ExtensionProblem[] } {
  const enabled: DtaasExtension[] = [];
  const problems: ExtensionProblem[] = [];
  const seen = new Set<string>();
  // validateExtension already refuses the substrates of the common core.
  const claimed = new Map<string, string>();
  for (const ext of extensions) {
    const reason = rejection(ext, env, seen, claimed);
    if (reason === undefined) {
      enabled.push(ext);
      claim(ext, claimed);
    } else {
      problems.push({ id: String(ext?.id), reason });
    }
    seen.add(ext?.id);
  }
  return { enabled, problems };
}

/**
 * Decide which extensions run, in manifest order, and merge what they add.
 * The first of two extensions with the same id or the same shared key wins.
 *
 * An extension left out for a missing service gives up its id and its keys,
 * so the checks run again without it, and an extension it blocked can run.
 * Each pass removes at least one extension, so the loop ends.
 */
export default function createExtensionHost(
  extensions: readonly DtaasExtension[],
  env: EnvRecord,
): ExtensionHost {
  const unmet: ExtensionProblem[] = [];
  let candidates = [...extensions];
  for (;;) {
    const { enabled, problems } = admit(candidates, env);
    const running = withRequirementsMet(enabled, unmet);
    if (running.length === enabled.length) {
      return {
        enabled: running,
        problems: [...problems, ...unmet],
        ...mount(running),
      };
    }
    candidates = candidates.filter(
      (ext) => !enabled.includes(ext) || running.includes(ext),
    );
  }
}
