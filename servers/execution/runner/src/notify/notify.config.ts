import { z } from 'zod';

// The optional webhook that receives every notification; the token is
// sent as a bearer token
export const notifyConfigSchema = z
  .object({
    url: z.url({ protocol: /^https?$/ }),
    token: z.string().optional(),
  })
  .strict();

export type NotifyConfig = z.infer<typeof notifyConfigSchema>;
