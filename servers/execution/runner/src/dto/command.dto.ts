import { z } from 'zod';

export const executeCommandSchema = z
  .object({
    name: z.string(),
  })
  .required();

export type ExecuteCommandDto = z.infer<typeof executeCommandSchema>;

export type ExecuteResponseDto = {
  status: 'success' | 'invalid command';
};

export const executeResponse = (success: boolean): ExecuteResponseDto => ({
  status: success ? 'success' : 'invalid command',
});
