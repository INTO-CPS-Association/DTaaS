import { z } from 'zod';

export const executeCommandSchema = z
  .object({
    name: z.string(),
  })
  .required();

export type ExecuteCommandDto = z.infer<typeof executeCommandSchema>;

// The optional HTTP header, or MQTT 5 user property, with which a client
// marks a request, so that the runner can recognise a repeat of it
export const REQUEST_KEY = 'idempotency-key';

export type ExecuteResponseDto = {
  status: 'success' | 'invalid command';
};

export const executeResponse = (success: boolean): ExecuteResponseDto => ({
  status: success ? 'success' : 'invalid command',
});
