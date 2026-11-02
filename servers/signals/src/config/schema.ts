import { z } from 'zod';

const TRUE_WORDS = new Set(['true', '1', 'yes', 'y']);
const FALSE_WORDS = new Set(['false', '0', 'no', 'n']);

function toBoolean(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (TRUE_WORDS.has(normalized)) return true;
  if (FALSE_WORDS.has(normalized)) return false;
  return value;
}

const booleanSchema = z.preprocess(toBoolean, z.boolean());
const positiveInt = z.coerce.number().int().positive();
const text = z.string().trim();

const MINUTE = 60_000;

export const configSchema = z
  .object({
    hostname: text.min(1).default('127.0.0.1'),
    port: positiveInt.default(4004),
    'cors-allow-origin': z
      .union([text, z.array(text.min(1)).min(1)])
      .default(''),
    'cors-allow-credentials': booleanSchema.default(false),
    'max-payload-bytes': positiveInt.default(64 * 1024),
    'throttle-ttl': positiveInt.default(MINUTE),
    'throttle-limit': positiveInt.default(120),
  })
  .strict();

export type ConfigValues = z.infer<typeof configSchema>;
export type ConfigKey = keyof ConfigValues;

export const CONFIG_KEYS = Object.keys(configSchema.shape) as ConfigKey[];

export function envNameOf(key: string): string {
  return `SIGNALS_${key.toUpperCase().replaceAll('-', '_')}`;
}
