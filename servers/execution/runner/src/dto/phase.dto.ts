import { z } from 'zod';

export const updatePhaseSchema = z
  .object({
    name: z.string(),
  })
  .required();

export type UpdatePhaseDto = z.infer<typeof updatePhaseSchema>;
