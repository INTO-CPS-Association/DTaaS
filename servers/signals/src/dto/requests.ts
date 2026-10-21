import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { z } from 'zod';
import { CHANNELS, type Channel } from '../authz/policy.js';
import { isPlainTopic } from '../broker/routing-key.js';

export type PathLimits = { maxPaths: number; maxPathLength: number };
export type RangeLimits = PathLimits & { maxSpan: number };

export type RangeRequest = {
  paths: string[];
  channel: Channel;
  from: number;
  to: number;
};

const streamSchema = z.object({ paths: z.array(z.unknown()) }).strict();

const rangeSchema = z
  .object({
    paths: z.array(z.unknown()),
    channel: z.enum(CHANNELS),
    from: z.number().int().nonnegative(),
    to: z.number().int().positive(),
  })
  .strict();

// Validation messages stay generic, so a refusal never echoes what was sent.
function badRequest(): BadRequestException {
  return new BadRequestException('Invalid request');
}

function checkedPaths(paths: unknown[], limits: PathLimits): string[] {
  if (paths.length === 0) throw badRequest();
  if (paths.length > limits.maxPaths)
    throw new PayloadTooLargeException('Too many paths');
  const valid = paths.every(
    (path) =>
      typeof path === 'string' && isPlainTopic(path, limits.maxPathLength),
  );
  if (!valid) throw badRequest();
  return [...new Set(paths as string[])];
}

export function parseStreamRequest(
  body: unknown,
  limits: PathLimits,
): string[] {
  const parsed = streamSchema.safeParse(body);
  if (!parsed.success) throw badRequest();
  return checkedPaths(parsed.data.paths, limits);
}

export function parseRangeRequest(
  body: unknown,
  limits: RangeLimits,
): RangeRequest {
  const parsed = rangeSchema.safeParse(body);
  if (!parsed.success) throw badRequest();
  const { channel, from, to } = parsed.data;
  if (to <= from || to - from > limits.maxSpan) throw badRequest();
  return { paths: checkedPaths(parsed.data.paths, limits), channel, from, to };
}
