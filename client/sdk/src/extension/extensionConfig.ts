import type { ZodSafeParseResult, ZodType } from 'zod';
import { EXTENSION_ENV_PREFIX, EXTENSIONS_DISABLED_KEY } from './constants';

export type EnvRecord = Readonly<Record<string, unknown>>;

/** `my-kit` → `REACT_APP_EXT_MY_KIT_`. */
export const envPrefix = (id: string): string =>
  `${EXTENSION_ENV_PREFIX}${id.toUpperCase().replace(/-/g, '_')}_`;

/** `SCADA_URL` → `scadaUrl`. */
const camelCase = (key: string): string =>
  key
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/**
 * Collects one extension's `REACT_APP_EXT_<ID>_*` keys from `env.js` and
 * validates them with the extension's schema. Never throws.
 *
 * Note: an id that is a hyphenated extension of another (`wind` and
 * `wind-farm`) shares a prefix; the shorter id also sees `FARM_*` keys.
 * Strict schemas reject them; the default zod object strips them.
 */
export const readExtensionConfig = <T>(
  id: string,
  schema: ZodType<T>,
  env: EnvRecord,
): ZodSafeParseResult<T> => {
  const prefix = envPrefix(id);
  const values = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [camelCase(key.slice(prefix.length)), value]),
  );
  return schema.safeParse(values);
};

/** True when `REACT_APP_EXTENSIONS_DISABLED` lists this id. */
export const isExtensionDisabled = (id: string, env: EnvRecord): boolean => {
  const list = env[EXTENSIONS_DISABLED_KEY];
  return typeof list === 'string' && list.split(/[\s,]+/).includes(id);
};
