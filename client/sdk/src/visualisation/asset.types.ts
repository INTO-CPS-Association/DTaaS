import type { z } from 'zod';
import type { visualisationAssetSchema } from '../schema/visualisation.schema';

/** A parsed `visualisation.json` library asset (R7). */
export type VisualisationAsset = z.infer<typeof visualisationAssetSchema>;
