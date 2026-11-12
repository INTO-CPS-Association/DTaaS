import type { ComponentType, LazyExoticComponent } from 'react';
import type { ZodType } from 'zod';
import type { SDK_MAJOR } from './constants';
import type { HostServices } from '../host/hostServices.types';
import type { DomainContribution } from '../visualisation/contribution.types';
import type { DigitalTwinSummary } from '../visualisation/digitalTwin.types';

/** A page component that is code-split with `React.lazy` (goal 4). */
export type LazyPage<P = object> = LazyExoticComponent<ComponentType<P>>;

/** A page mounted at `/<id>` (empty `path`) or `/<id>/<path>`. */
export interface ExtensionRoute {
  readonly path: string;
  readonly element: LazyPage;
}

export interface NavigationItem {
  readonly label: string;
  /** Absolute app path, normally `/<id>` or `/<id>/<route path>`. */
  readonly path: string;
  readonly icon?: ComponentType;
  /** Menu position; lower comes first. */
  readonly order?: number;
}

export interface DigitalTwinTabProps {
  readonly dt: DigitalTwinSummary;
}

/** A tab added to the Digital Twins page beyond the generic Visualise tab. */
export interface DigitalTwinTab {
  readonly id: string;
  readonly label: string;
  applies(dt: DigitalTwinSummary): boolean | Promise<boolean>;
  readonly element: LazyPage<DigitalTwinTabProps>;
}

export interface AssetPreviewProps {
  readonly url: string;
  readonly name: string;
}

/** A previewer for Library files, matched by file extension or MIME type. */
export interface AssetPreview {
  readonly id: string;
  readonly extensions?: readonly string[];
  readonly mimeTypes?: readonly string[];
  readonly element: LazyPage<AssetPreviewProps>;
}

/**
 * Structurally compatible with Redux's `Reducer<S>`, so a Redux Toolkit slice
 * reducer can be passed without the SDK depending on Redux. A type alias (not
 * an interface) so the action type gets an implicit index signature.
 */
export type ExtensionAction = { type: string };
export type ExtensionReducer<S> = (
  state: S | undefined,
  action: ExtensionAction,
) => S;

/** Runtime configuration read from `env.js` keys `REACT_APP_EXT_<ID>_*`. */
export interface ExtensionConfigSpec<T = unknown> {
  readonly schema: ZodType<T>;
}

/** What a domain extension contributes to the host. */
export interface DtaasExtension<S = unknown> {
  /** Stable, lowercase; a route prefix, Redux key and env.js key. */
  readonly id: string;
  readonly name: string;
  readonly version: string;
  /** The dtaas-sdk major this extension was built against. */
  readonly sdk: typeof SDK_MAJOR;
  /**
   * The versions of the extension API this extension works with, as a semver
   * range such as `^1.1`. A host whose `SDK_VERSION` is outside it refuses the
   * extension. Without it, any version of the `sdk` major is accepted.
   */
  readonly apiRange?: string;
  readonly routes?: readonly ExtensionRoute[];
  readonly navigation?: readonly NavigationItem[];
  readonly digitalTwinTabs?: readonly DigitalTwinTab[];
  readonly assetPreviews?: readonly AssetPreview[];
  /** Redux slice mounted at `state.ext.<id>`. */
  readonly reducer?: ExtensionReducer<S>;
  readonly config?: ExtensionConfigSpec;
  /** Called once after the store exists and host services are ready. */
  setup?(host: HostServices): void | Promise<void>;
  readonly visualisation?: DomainContribution;
}
