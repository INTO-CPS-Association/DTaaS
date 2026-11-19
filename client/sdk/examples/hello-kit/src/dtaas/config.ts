import { z } from 'zod';

/** `env.js` keys `REACT_APP_EXT_HELLO_*`, read through `HostServices.config`. */
const configSchema = z.object({
  greeting: z.string().min(1),
});

export default configSchema;
