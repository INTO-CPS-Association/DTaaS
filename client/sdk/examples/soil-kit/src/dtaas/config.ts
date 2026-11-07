import { z } from 'zod';

/**
 * `env.js` keys `REACT_APP_EXT_SOIL_*`, read through `HostServices.config`.
 * `REACT_APP_EXT_SOIL_TWIN` names the folder of the soil twin under the
 * digital twins directory of the library, whose `visualisation.json` lists
 * the profiles and their sensors.
 */
const configSchema = z.object({
  twin: z.string().regex(/^[\w-]+$/, 'a folder name, without a slash'),
});

export default configSchema;
