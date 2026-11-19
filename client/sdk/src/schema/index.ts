// Shared building blocks
export { channelSchema, domainSchema, pointSchema } from './common.schema';

// Layer 1: transports
export { transportSchema } from './transport.schema';

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
  visualisationAssetSchema,
} from './visualisation.schema';
