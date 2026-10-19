import type Config from 'src/config/config.service';
import { type ConfigValues, configSchema } from 'src/config/schema';

/** A Config with the defaults, and the given values on top. */
export default function testConfig(
  overrides: Partial<ConfigValues> = {},
): Config {
  const values: ConfigValues = { ...configSchema.parse({}), ...overrides };
  return {
    get: <K extends keyof ConfigValues>(key: K) => values[key],
  } as unknown as Config;
}
