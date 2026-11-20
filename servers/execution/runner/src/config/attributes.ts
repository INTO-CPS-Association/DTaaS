import { z } from 'zod';
import { nameSchema } from '../fsm/name.js';

// Facts about a digital twin for a Manager; a flat map, so that a
// Manager can filter runners by any of them
export const attributesSchema = z.record(
  nameSchema,
  z.union([z.string(), z.number(), z.boolean()]),
);

export type Attributes = z.infer<typeof attributesSchema>;
