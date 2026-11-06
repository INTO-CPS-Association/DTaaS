import { z } from 'zod';
import { channelSchema, domainSchema, nonEmpty, text } from './common.schema';

const comparisonSchema = z.object({
  op: z.enum(['<', '<=', '>', '>=', '==', '!=']),
  value: z.union([z.number(), text, z.boolean()]),
});

const scheme = nonEmpty.optional();

const colorScale = z.object({
  type: z.literal('colorScale'),
  domain: domainSchema,
  scheme: nonEmpty,
  channel: channelSchema.optional(),
  clamp: z.boolean().optional(),
});

const visibility = z.object({
  type: z.literal('visibility'),
  when: comparisonSchema,
});

const transform = z.object({
  type: z.literal('transform'),
  property: z.enum(['translate', 'rotate', 'scale']),
  axis: z.enum(['x', 'y', 'z']),
  domain: domainSchema,
  range: domainSchema,
});

const flow = z.object({
  type: z.literal('flow'),
  speedDomain: domainSchema,
  direction: z.enum(['forward', 'reverse', 'signed']).optional(),
});

const residual = z.object({
  type: z.literal('residual'),
  against: channelSchema,
  domain: domainSchema,
  scheme,
});

const ghost = z.object({
  type: z.literal('ghost'),
  channel: channelSchema,
  opacity: z.number().min(0).max(1).optional(),
});

const label = z.object({
  type: z.literal('label'),
  format: nonEmpty.optional(),
  unit: text.optional(),
  precision: z.number().int().min(0).optional(),
});

const attention = z.object({
  type: z.literal('attention'),
  when: comparisonSchema,
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

const glyph = z.object({
  type: z.literal('glyph'),
  shape: z.enum(['circle', 'square', 'triangle', 'arrow']),
  sizeDomain: domainSchema.optional(),
  scheme,
});

const regionFill = z.object({
  type: z.literal('regionFill'),
  domain: domainSchema,
  scheme: nonEmpty,
});

const fieldOverlay = z.object({
  type: z.literal('fieldOverlay'),
  kernel: nonEmpty,
  domain: domainSchema,
  scheme: nonEmpty,
  resolution: z.number().positive().optional(),
});

const trajectory = z.object({
  type: z.literal('trajectory'),
  windowMs: z.number().positive(),
  scheme,
});

/** The encoding vocabulary of layer 4: declarative value-to-visual rules. */
export const encodingSchema = z.discriminatedUnion('type', [
  colorScale,
  visibility,
  transform,
  flow,
  residual,
  ghost,
  label,
  attention,
  glyph,
  regionFill,
  fieldOverlay,
  trajectory,
]);

export default encodingSchema;
