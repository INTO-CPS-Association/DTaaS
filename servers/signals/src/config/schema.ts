import { z } from 'zod';

// Environment variables arrive as text, YAML gives numbers. Only digit
// strings are converted, so `true` or `1e3` is refused and not read as 1.
const wholeNumber = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().positive());
const port = wholeNumber.pipe(z.number().max(65_535));

export const configSchema = z
  .object({
    hostname: z.string().trim().min(1).default('127.0.0.1'),
    port: port.default(4004),
    'max-payload-bytes': wholeNumber.default(64 * 1024),
  })
  .strict();

export type ConfigValues = z.infer<typeof configSchema>;
export type ConfigKey = keyof ConfigValues;

export const CONFIG_KEYS = Object.keys(configSchema.shape) as ConfigKey[];

export function envNameOf(key: string): string {
  return `SIGNALS_${key.toUpperCase().replaceAll('-', '_')}`;
}
