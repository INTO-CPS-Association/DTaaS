/**
 * The environment-neutral part of the contract: constants, validation, the
 * extension and host-service types and the visualisation helpers. Nothing
 * here imports React at run time, so a host that runs outside a browser,
 * such as a command line tool, can import it. The types of the React-facing
 * members (`AuthService.useUser`, `UiService.Page`, `Playhead.use` and
 * others) still name React types, so a type check of them needs
 * `@types/react`.
 */
// Constants
export {
  CHANNELS,
  DEPLOYED_EXTENSIONS_GLOBAL,
  deployedKeyOf,
  EXTENSION_ENV_PREFIX,
  EXTENSIONS_DEPLOYED_KEY,
  EXTENSIONS_DISABLED_KEY,
  API_MAJOR,
  API_VERSION,
  SDK_MAJOR,
  SDK_VERSION,
  SHARED_MODULES,
  SHARED_MODULES_GLOBAL,
  STANDARD_ANCHOR_KINDS,
  STANDARD_SUBSTRATES,
} from '../extension/constants';

// Extension helpers
export { default as defineExtension } from '../extension/defineExtension';
export {
  envPrefix,
  isExtensionDisabled,
  readExtensionConfig,
} from '../extension/extensionConfig';
export type { EnvRecord } from '../extension/extensionConfig';
export { isLazyComponent, isLazyLoader } from '../extension/lazy';
export { isApiRange, satisfiesApiRange } from '../extension/apiRange';
export { default as validateExtension } from '../extension/validateExtension';
export type {
  ValidateOptions,
  ValidationResult,
} from '../extension/validateExtension';

// Extension contract
export type {
  AssetPreview,
  AssetPreviewProps,
  DigitalTwinTab,
  DigitalTwinTabProps,
  DtaasExtension,
  ExtensionAction,
  ExtensionConfigSpec,
  ExtensionReducer,
  ExtensionRoute,
  LazyPage,
  NavigationItem,
  ProvidedService,
} from '../extension/extension.types';

// Host services
export type { HostServices } from '../host/hostServices.types';
export type {
  AuthService,
  ExtensionServices,
  LibraryConventions,
  LibraryService,
  Logger,
  PageProps,
  SettingsService,
  SnackbarSeverity,
  UiService,
  User,
} from '../host/platform.types';
export type {
  CommitResult,
  ContentsEntry,
  ContentsService,
  FileChange,
  GitService,
  MergeRequestResult,
  PutOptions,
} from '../host/storage.types';
export type {
  ConnectionState,
  ConnectionStatus,
  Playhead,
  SaveOptions,
  SignalRegistry,
  SignalsService,
  SubstrateRegistry,
  VizService,
} from '../host/visualisation.types';
export { default as worstConnectionState } from '../host/connection';

// Visualisation layers
export type {
  Channel,
  Sampled,
  SignalQuality,
  SignalSample,
  SignalSink,
  SignalValue,
  TransportAdapter,
} from '../visualisation/signal.types';
export type {
  Anchor,
  AnchorKind,
  StandardAnchorKind,
} from '../visualisation/anchor.types';
export type {
  Encoding,
  EncodingType,
  ResolvedEncoding,
} from '../visualisation/encoding.types';
export type {
  ElementRef,
  FrameOptions,
  SubstrateAdapter,
  SubstrateAdapterFactory,
  SubstrateDescriptor,
} from '../visualisation/substrate.types';
export type {
  AnchorKindSpec,
  Converter,
  ConverterInput,
  ConverterOutput,
  ConverterSpec,
  DomainContribution,
  EncodingPreset,
  FieldGrid,
  FieldKernel,
  FieldKernelSpec,
  FieldSample,
  InspectorPanelProps,
  LazyModule,
  LazySubstrateAdapterSpec,
  ScopeContext,
  ScopeRule,
} from '../visualisation/contribution.types';
export type {
  DigitalTwinSummary,
  TbEntity,
} from '../visualisation/digitalTwin.types';
export type { VisualisationAsset } from '../visualisation/asset.types';
export { SCHEMES, colourAt, position } from '../visualisation/schemes';
