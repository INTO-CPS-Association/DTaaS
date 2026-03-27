import { z } from 'zod';

const MAX_CONTEXT_ENTRIES = 100;
const MAX_CONTEXT_VALUE_LENGTH = 1024;

const contextSchema = z
  .record(z.string().max(128), z.string().max(MAX_CONTEXT_VALUE_LENGTH))
  .refine(
    (context) => Object.keys(context).length <= MAX_CONTEXT_ENTRIES,
    `context may have at most ${MAX_CONTEXT_ENTRIES} entries`,
  );

export const logEventSchema = z
  .object({
    sessionId: z.string().uuid(),
    userHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, 'userHash must be a SHA-256 hex string'),
    timestamp: z.string().datetime({ offset: true }),
    event: z.string().min(1).max(64),
    page: z.string().min(1).max(1024),
    element: z.string().min(1).max(128),
    label: z.string().min(1).max(512),
    context: contextSchema.default({}),
  })
  .required();

export type LogEventDto = z.infer<typeof logEventSchema>;
