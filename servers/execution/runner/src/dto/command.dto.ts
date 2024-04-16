import { z } from 'zod';

export const executeCommandSchema = z
  .object({
    name: z.string(),
  })
  .required();

export type ExecuteCommandDto = z.infer<typeof executeCommandSchema>;
