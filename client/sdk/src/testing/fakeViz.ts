import type { SaveOptions, VizService } from '../host/visualisation.types';
import { visualisationAssetSchema } from '../schema/visualisation.schema';
import type { VisualisationAsset } from '../visualisation/asset.types';
import type {
  AnchorKindSpec,
  EncodingPreset,
} from '../visualisation/contribution.types';
import type { DigitalTwinSummary } from '../visualisation/digitalTwin.types';
import type { SubstrateAdapter } from '../visualisation/substrate.types';

export interface FakeVizOptions {
  readonly substrates?: Readonly<Record<string, SubstrateAdapter>>;
  readonly anchorKinds?: readonly AnchorKindSpec[];
  readonly presets?: readonly EncodingPreset[];
}

export interface RecordedSave {
  readonly dt: DigitalTwinSummary;
  readonly asset: VisualisationAsset;
  readonly options?: SaveOptions;
}

const issuesOf = (asset: unknown) => {
  const result = visualisationAssetSchema.safeParse(asset);
  return result.success
    ? undefined
    : result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
};

const createSubstrateRegistry = (
  substrates: Readonly<Record<string, SubstrateAdapter>>,
) => ({
  list: () => Object.keys(substrates),
  get: async (id: string) => {
    const adapter = substrates[id];
    if (!adapter) throw new Error(`Unknown substrate: ${id}`);
    return adapter;
  },
});

/** Stores `visualisation.json` assets per twin, validating like the host. */
const createFakeViz = (
  options: FakeVizOptions = {},
  saved: RecordedSave[] = [],
): VizService => {
  const assets = new Map<string, VisualisationAsset>();
  return {
    anchorKinds: options.anchorKinds ?? [],
    presets: options.presets ?? [],
    substrates: createSubstrateRegistry(options.substrates ?? {}),
    load: async (dt) => assets.get(dt.path) ?? null,
    save: async (dt, asset, saveOptions) => {
      const issues = issuesOf(asset);
      if (issues) throw new Error(`Invalid visualisation asset: ${issues}`);
      assets.set(dt.path, asset);
      saved.push({ dt, asset, options: saveOptions });
    },
  };
};

export default createFakeViz;
