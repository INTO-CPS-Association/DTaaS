// Constants
export {
  CHANNELS,
  EXTENSION_ENV_PREFIX,
  EXTENSIONS_DISABLED_KEY,
  RESERVED_EXTENSION_IDS,
  SDK_MAJOR,
  SDK_VERSION,
  STANDARD_ANCHOR_KINDS,
  STANDARD_SUBSTRATES,
} from './extension/constants';

// Extension helpers
export { default as defineExtension } from './extension/defineExtension';
export {
  envPrefix,
  isExtensionDisabled,
  readExtensionConfig,
} from './extension/extensionConfig';
export type { EnvRecord } from './extension/extensionConfig';
export { isLazyComponent, isLazyLoader } from './extension/lazy';
export { isApiRange, satisfiesApiRange } from './extension/apiRange';
export { default as validateExtension } from './extension/validateExtension';
export type {
  ValidateOptions,
  ValidationResult,
} from './extension/validateExtension';

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
} from './extension/extension.types';

// Host services
export { HostProvider, useHost } from './host/HostProvider';
export type { HostProviderProps } from './host/HostProvider';
export type { HostServices } from './host/hostServices.types';
export type {
  AuthService,
  LibraryConventions,
  LibraryService,
  Logger,
  PageProps,
  SettingsService,
  SnackbarSeverity,
  UiService,
  User,
} from './host/platform.types';
export type {
  CommitResult,
  ContentsEntry,
  ContentsService,
  FileChange,
  GitService,
  MergeRequestResult,
  PutOptions,
} from './host/storage.types';
export type {
  ConnectionState,
  ConnectionStatus,
  Playhead,
  SaveOptions,
  SignalRegistry,
  SignalsService,
  SubstrateRegistry,
  VizService,
} from './host/visualisation.types';
export { default as worstConnectionState } from './host/connection';

// Visualisation layers
export type {
  Channel,
  Sampled,
  SignalQuality,
  SignalSample,
  SignalSink,
  SignalValue,
  TransportAdapter,
} from './visualisation/signal.types';
export type {
  Anchor,
  AnchorKind,
  StandardAnchorKind,
} from './visualisation/anchor.types';
export type {
  Encoding,
  EncodingType,
  ResolvedEncoding,
} from './visualisation/encoding.types';
export type {
  ElementRef,
  FrameOptions,
  SubstrateAdapter,
  SubstrateAdapterFactory,
  SubstrateDescriptor,
} from './visualisation/substrate.types';
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
} from './visualisation/contribution.types';
export type {
  DigitalTwinSummary,
  TbEntity,
} from './visualisation/digitalTwin.types';
export type { VisualisationAsset } from './visualisation/asset.types';
