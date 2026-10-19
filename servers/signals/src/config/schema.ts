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
const httpUrl = z.url({ protocol: /^https?$/ });
const amqpUrl = z.url({ protocol: /^amqps?$/ });
// A template without the owner would put every user's twins in one vhost or
// bucket, where one user's declaration could name another user's topic.
const ownerTemplate = text.refine((value) => value.includes('{owner}'), {
  message: 'must contain {owner}, so each owner has their own vhost or bucket',
});

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

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
    'gitlab-url': z.union([z.literal(''), httpUrl]).default(''),
    'gitlab-group': text.min(1).default('DTaaS'),
    'gitlab-branch': text.min(1).default('master'),
    'gitlab-min-access-level': positiveInt.default(20),
    'gitlab-timeout': positiveInt.default(5000),
    'forwarded-user-header': text.toLowerCase().default(''),
    'gitlab-client-id': text.default(''),
    'identity-cache-ttl': positiveInt.default(MINUTE),
    'projects-cache-ttl': positiveInt.default(MINUTE),
    'rabbitmq-url': amqpUrl.default('amqp://localhost:5672'),
    'rabbitmq-user': text.min(1).default('dtaas-signals'),
    'rabbitmq-password-file': text.default(''),
    'vhost-template': ownerTemplate.default('{owner}'),
    'influx-url': httpUrl.default('http://localhost:8086'),
    'influx-tokens-file': text.default(''),
    'influx-org-template': ownerTemplate.default('{owner}'),
    'influx-bucket-template': ownerTemplate.default('{owner}'),
    'influx-timeout': positiveInt.default(10_000),
    'max-paths-per-stream': positiveInt.default(200),
    'max-path-length': positiveInt.default(256),
    'max-streams-per-user': positiveInt.default(4),
    'max-message-bytes': positiveInt.default(64 * 1024),
    'stream-max-age': positiveInt.default(10 * MINUTE),
    'keep-alive-interval': positiveInt.default(15_000),
    'retry-interval': positiveInt.default(5000),
    'range-max-span': positiveInt.default(7 * DAY),
    'range-max-points': positiveInt.default(10_000),
  })
  .strict();

export type ConfigValues = z.infer<typeof configSchema>;
export type ConfigKey = keyof ConfigValues;

// Keys that name a file. A relative path is read against the directory of
// the YAML file that set it, so a deployment can move the whole folder.
export const FILE_KEYS: readonly ConfigKey[] = [
  'rabbitmq-password-file',
  'influx-tokens-file',
];

// Secrets written inline would end up in backups, diffs and process listings.
// Each one has a *-file key instead, and naming it inline is refused.
export const INLINE_SECRET_KEYS: Readonly<Record<string, ConfigKey>> = {
  'rabbitmq-password': 'rabbitmq-password-file',
  'influx-token': 'influx-tokens-file',
  'influx-tokens': 'influx-tokens-file',
};

export const CONFIG_KEYS = Object.keys(configSchema.shape) as ConfigKey[];

export function envNameOf(key: string): string {
  return `SIGNALS_${key.toUpperCase().replaceAll('-', '_')}`;
}
