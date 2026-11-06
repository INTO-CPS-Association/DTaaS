import { z } from 'zod';
import { listOf, nonEmpty, text } from './common.schema';
import { anchorSchema } from './anchor.schema';
import { encodingSchema } from './encoding.schema';
import { encodingPresetSchema } from './preset.schema';
import { substrateDescriptorSchema } from './substrate.schema';
import { transportSchema } from './transport.schema';

const layoutSchema = z.object({
  type: z.enum(['single', 'split', 'grid', 'tabs']),
  panes: listOf(nonEmpty).min(1),
});

/** Binds a signal to a substrate with an inline encoding or a named preset. */
const encodingBindingSchema = z
  .object({
    target: nonEmpty,
    substrate: nonEmpty,
    encoding: encodingSchema.optional(),
    preset: nonEmpty.optional(),
  })
  .refine((b) => (b.encoding === undefined) !== (b.preset === undefined), {
    message: 'Each binding needs exactly one of "encoding" or "preset"',
  });

const assetShape = z.object({
  schemaVersion: text.regex(/^1\.\d+$/, 'Only schema version 1.x'),
  name: nonEmpty,
  description: text.optional(),
  domain: nonEmpty.optional(),
  layout: layoutSchema,
  substrates: z.record(nonEmpty, substrateDescriptorSchema),
  transports: listOf(transportSchema).default([]),
  anchors: listOf(anchorSchema).default([]),
  encodings: listOf(encodingBindingSchema).default([]),
  presets: listOf(encodingPresetSchema).optional(),
});

type AssetShape = z.infer<typeof assetShape>;

/** Own keys only: `toString` or `constructor` are not substrates. */
const hasSubstrate = (asset: AssetShape, id: string) =>
  Object.prototype.hasOwnProperty.call(asset.substrates, id);

const unknownReference = (
  ctx: z.RefinementCtx,
  path: (string | number)[],
  what: string,
) => {
  ctx.addIssue({ code: 'custom', path, message: `Unknown ${what}` });
};

const checkPanes = (asset: AssetShape, ctx: z.RefinementCtx) => {
  asset.layout.panes.forEach((pane, i) => {
    if (!hasSubstrate(asset, pane)) {
      unknownReference(ctx, ['layout', 'panes', i], `substrate "${pane}"`);
    }
  });
};

const checkBindings = (asset: AssetShape, ctx: z.RefinementCtx) => {
  asset.encodings.forEach((binding, i) => {
    if (!hasSubstrate(asset, binding.substrate)) {
      const what = `substrate "${binding.substrate}"`;
      unknownReference(ctx, ['encodings', i, 'substrate'], what);
    }
  });
};

const checkHomographies = (asset: AssetShape, ctx: z.RefinementCtx) => {
  const ids = new Set(
    Object.values(asset.substrates).map((s) => s.calibration?.id),
  );
  asset.anchors.forEach((anchor, i) => {
    if (anchor.homographyId !== undefined && !ids.has(anchor.homographyId)) {
      const what = `homography "${anchor.homographyId}"`;
      unknownReference(ctx, ['anchors', i, 'homographyId'], what);
    }
  });
};

/** A `visualisation.json` library asset, including its cross-references. */
export const visualisationAssetSchema = assetShape.superRefine((asset, ctx) => {
  checkPanes(asset, ctx);
  checkBindings(asset, ctx);
  checkHomographies(asset, ctx);
});

/** Validates an unknown value as a visualisation asset without throwing. */
export const parseVisualisationAsset = (json: unknown) =>
  visualisationAssetSchema.safeParse(json);
