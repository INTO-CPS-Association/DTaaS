import { z } from 'zod';
import {
  listOf,
  MAX_ASSET_BYTES,
  nonEmpty,
  recordOf,
  text,
} from './common.schema';
import { anchorSchema } from './anchor.schema';
import { checkCoverage } from './coverage';
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
  substrates: recordOf(substrateDescriptorSchema),
  transports: listOf(transportSchema).default([]),
  anchors: listOf(anchorSchema).default([]),
  encodings: listOf(encodingBindingSchema).default([]),
  presets: listOf(encodingPresetSchema).optional(),
});

type AssetShape = z.infer<typeof assetShape>;

/** Own keys only: `toString` or `constructor` are not substrates. */
const hasSubstrate = (asset: AssetShape, id: string) =>
  Object.hasOwn(asset.substrates, id);

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
  checkCoverage(asset.transports, asset.encodings, ctx);
});

type Asset = z.output<typeof visualisationAssetSchema>;

/** What a deployment lets the transports of an asset connect to. */
export interface AssetPolicy {
  /**
   * Origins a transport `url` may name, such as `wss://broker.example:15676`
   * or `https://api.example`. A transport URL with another origin is refused,
   * so an asset cannot point its viewers at a broker or endpoint the
   * deployment did not choose. An empty list allows none.
   */
  readonly allowedOrigins: readonly string[];
}

/** Schemes whose URL names a server the browser would connect to. */
const NETWORK_SCHEMES = ['http:', 'https:', 'ws:', 'wss:', 'mqtt:', 'mqtts:'];

/**
 * `scheme://host:port` of a network URL, or undefined for any other value.
 * `URL.origin` is `null` for `mqtt:`, so the origin is built from its parts.
 */
const originOf = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    return NETWORK_SCHEMES.includes(url.protocol)
      ? `${url.protocol}//${url.host}`
      : undefined;
  } catch {
    return undefined;
  }
};

const failure = (
  issues: readonly { path: (string | number)[]; message: string }[],
): z.ZodSafeParseResult<Asset> => ({
  success: false,
  // The type parameter of ZodError only names the shape that failed to parse.
  error: new z.ZodError(
    issues.map(({ path, message }) => ({ code: 'custom', path, message })),
  ) as z.ZodError<Asset>,
});

const originIssues = (asset: Asset, policy: AssetPolicy) => {
  const allowed = new Set(policy.allowedOrigins.map(originOf));
  return asset.transports.flatMap((transport, i) => {
    const origin =
      transport.url === undefined ? undefined : originOf(transport.url);
    return origin === undefined || allowed.has(origin)
      ? []
      : [
          {
            path: ['transports', i, 'url'],
            message: `The origin ${origin} is not one this deployment allows`,
          },
        ];
  });
};

/**
 * Validates an unknown value as a visualisation asset without throwing. With
 * a `policy`, every transport URL must also name an origin the policy allows.
 */
export const parseVisualisationAsset = (
  json: unknown,
  policy?: AssetPolicy,
): z.ZodSafeParseResult<Asset> => {
  const result = visualisationAssetSchema.safeParse(json);
  if (!result.success || policy === undefined) return result;
  const issues = originIssues(result.data, policy);
  return issues.length === 0 ? result : failure(issues);
};

/** The size of `input` in bytes, or `undefined` once it is above the bound. */
const sizeOf = (input: string | Uint8Array): number | undefined => {
  if (typeof input !== 'string') {
    return input.byteLength > MAX_ASSET_BYTES ? undefined : input.byteLength;
  }
  // Every UTF-16 unit takes at least one byte in UTF-8, so a longer string is
  // too large without encoding it.
  if (input.length > MAX_ASSET_BYTES) return undefined;
  const bytes = new TextEncoder().encode(input).byteLength;
  return bytes > MAX_ASSET_BYTES ? undefined : bytes;
};

/**
 * Reads a `visualisation.json` as a host does: refuses more than
 * `MAX_ASSET_BYTES` before parsing, parses the JSON and validates it against
 * the schema and the deployment's `policy`. Never throws.
 */
export const readVisualisationAsset = (
  input: string | Uint8Array,
  policy: AssetPolicy,
): z.ZodSafeParseResult<Asset> => {
  if (sizeOf(input) === undefined) {
    return failure([
      {
        path: [],
        message: `A visualisation asset may hold at most ${MAX_ASSET_BYTES} bytes`,
      },
    ]);
  }
  let json: unknown;
  try {
    json = JSON.parse(
      typeof input === 'string' ? input : new TextDecoder().decode(input),
    );
  } catch {
    return failure([{ path: [], message: 'The asset is not valid JSON' }]);
  }
  return parseVisualisationAsset(json, policy);
};
