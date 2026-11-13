import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { z } from 'zod';
import { CHANNELS, type Channel } from '../authz/policy.js';
import isPlainTopic from '../topic.js';

export type PathLimits = { maxPaths: number; maxPathLength: number };
export type RangeLimits = PathLimits & { maxSpan: number };

/** One twin: the project that holds it and the folder of its files. */
export type TwinRef = { owner: string; name: string };

export type RangeRequest = {
  paths: string[];
  channel: Channel;
  from: number;
  to: number;
};

// A GitLab project path and a twin folder name, never a path with a slash.
const namePart = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\w.-]+$/);
const twinSchema = z.object({ owner: namePart, name: namePart }).strict();

const streamSchema = z
  .object({ paths: z.array(z.unknown()), twin: twinSchema.optional() })
  .strict();

const rangeSchema = z
  .object({
    paths: z.array(z.unknown()),
    channel: z.enum(CHANNELS),
    from: z.number().int().nonnegative(),
    to: z.number().int().positive(),
    twin: twinSchema.optional(),
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

/**
 * The twin a stream or range request names, or undefined when it names none.
 * Call it after parseStreamRequest or parseRangeRequest, which refuse a twin
 * that is not valid.
 */
export function twinOf(body: unknown): TwinRef | undefined {
  const parsed = z.object({ twin: twinSchema }).safeParse(body);
  return parsed.success ? parsed.data.twin : undefined;
}
