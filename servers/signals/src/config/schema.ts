import { z } from 'zod';

const positiveInt = z.coerce.number().int().positive();

export const configSchema = z
  .object({
    hostname: z.string().trim().min(1).default('127.0.0.1'),
    port: positiveInt.default(4004),
    'max-payload-bytes': positiveInt.default(64 * 1024),
  })
  .strict();

export type ConfigValues = z.infer<typeof configSchema>;
export type ConfigKey = keyof ConfigValues;

export const CONFIG_KEYS = Object.keys(configSchema.shape) as ConfigKey[];

export function envNameOf(key: string): string {
  return `SIGNALS_${key.toUpperCase().replaceAll('-', '_')}`;
}
