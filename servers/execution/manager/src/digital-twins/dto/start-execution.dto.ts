import { z } from 'zod';

export const startExecutionOptionsSchema = z
  .object({
    runnerTag: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
  })
  .strict();

export type StartExecutionOptions = z.infer<typeof startExecutionOptionsSchema>;
