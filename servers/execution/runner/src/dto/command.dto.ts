import { z } from 'zod';

export const updateCommandSchema = z
  .object({
    name: z.string(),
  })
  .required();

export type ExecuteCommandDto = z.infer<typeof updateCommandSchema>;
