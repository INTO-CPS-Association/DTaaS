import { z } from 'zod';
import { listOf, nonEmpty, text } from './common.schema';
import { encodingSchema } from './encoding.schema';

/** Lowercase segments separated by dots, e.g. `bim.thermal-comfort`. */
const PRESET_ID = /^[a-z][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$/;

/** A named, domain-typed bundle of encodings a user can pick. */
export const encodingPresetSchema = z.object({
  id: text.regex(PRESET_ID),
  label: nonEmpty,
  description: text.optional(),
  substrate: nonEmpty,
  encodings: listOf(
    z.object({ target: nonEmpty, encoding: encodingSchema }),
  ).min(1),
});

export default encodingPresetSchema;
