import { z } from 'zod';
import { CHANNELS } from '../extension/constants';

/**
 * Upper bounds for any string, list and record in a `visualisation.json`. A
 * library asset comes from a repository a user can edit, so the bounds stop
 * one oversized asset from stalling the host that parses and renders it.
 * Nested lists multiply, so `MAX_ASSET_BYTES` bounds the whole asset as well.
 */
export const MAX_STRING_LENGTH = 2048;
export const MAX_LIST_LENGTH = 1000;
export const MAX_RECORD_ENTRIES = 1000;

/** The largest `visualisation.json`, in bytes, a host reads (1 MiB). */
export const MAX_ASSET_BYTES = 1024 * 1024;

export const channelSchema = z.enum(CHANNELS);

/** Any string up to the length bound, including the empty string. */
export const text = z.string().max(MAX_STRING_LENGTH);

export const nonEmpty = text.min(1);

/** A list of `item` up to the length bound. */
export const listOf = <T extends z.ZodType>(item: T) =>
  z.array(item).max(MAX_LIST_LENGTH);

/** A record with non-empty keys and at most `max` entries. */
export const recordOf = <T extends z.ZodType>(
  value: T,
  max: number = MAX_RECORD_ENTRIES,
) =>
  z
    .record(nonEmpty, value)
    .refine((record) => Object.keys(record).length <= max, {
      message: `Expected at most ${max} entries`,
    });

/** A `[min, max]` numeric interval. */
export const domainSchema = z.tuple([z.number(), z.number()]);

/** A 2D point in image or world coordinates. */
export const pointSchema = z.tuple([z.number(), z.number()]);
