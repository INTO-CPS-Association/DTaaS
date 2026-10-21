import { z } from 'zod';

// A digital twin is named after its directory, so the name holds no path.
export const dtNameSchema = z
  .string()
  .trim()
  .regex(/^[\w-][\w.-]*$/, 'must be a directory name');
