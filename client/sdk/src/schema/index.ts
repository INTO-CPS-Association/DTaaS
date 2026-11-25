// Shared building blocks and bounds
export {
  channelSchema,
  domainSchema,
  MAX_ASSET_BYTES,
  MAX_LIST_LENGTH,
  MAX_RECORD_ENTRIES,
  MAX_STRING_LENGTH,
  pointSchema,
} from './common.schema';

// Layer 1: transports
export { MIN_POLL_INTERVAL_MS, transportSchema } from './transport.schema';

// Layer 3: anchors
export { anchorSchema } from './anchor.schema';

// Layer 4: encodings and presets
export { encodingSchema } from './encoding.schema';
export { encodingPresetSchema } from './preset.schema';

// Layer 5: substrates
export {
  calibrationSchema,
  substrateDescriptorSchema,
} from './substrate.schema';

// visualisation.json
export {
  parseVisualisationAsset,
  readVisualisationAsset,
  visualisationAssetSchema,
} from './visualisation.schema';
export type { AssetPolicy } from './visualisation.schema';
