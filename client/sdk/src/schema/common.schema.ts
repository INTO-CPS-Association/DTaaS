import { z } from 'zod';
import { CHANNELS } from '../extension/constants';

/**
 * Upper bounds for any string and any list in a `visualisation.json`. A
 * library asset comes from a repository a user can edit, so the bounds stop
 * one oversized asset from stalling the host that parses and renders it.
 */
export const MAX_STRING_LENGTH = 2048;
export const MAX_LIST_LENGTH = 1000;

export const channelSchema = z.enum(CHANNELS);

/** Any string up to the length bound, including the empty string. */
export const text = z.string().max(MAX_STRING_LENGTH);

export const nonEmpty = text.min(1);

/** A list of `item` up to the length bound. */
export const listOf = <T extends z.ZodType>(item: T) =>
  z.array(item).max(MAX_LIST_LENGTH);

/** A `[min, max]` numeric interval. */
export const domainSchema = z.tuple([z.number(), z.number()]);

/** A 2D point in image or world coordinates. */
export const pointSchema = z.tuple([z.number(), z.number()]);
