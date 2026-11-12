import { z } from 'zod';
import { CHANNELS } from '../authz/policy.js';

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
// Environment variables arrive as text, YAML gives numbers. Only digit
// strings are converted, so `true` or `1e3` is refused and not read as 1.
const positiveInt = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().positive());
const port = positiveInt.pipe(z.number().max(65_535));
const text = z.string().trim();
const httpUrl = z.url({ protocol: /^https?$/ });

// A Keycloak realm or a Dex instance whose JWTs the gateway accepts.
const oidcProviderSchema = z
  .object({
    issuer: httpUrl,
    audience: text.min(1),
    'jwks-url': httpUrl,
    'groups-claim': text.min(1).default('groups'),
    // 'access-plan' for Keycloak, 'dex-gitlab' for the GitLab connector of Dex.
    'groups-format': z
      .enum(['access-plan', 'dex-gitlab'])
      .default('access-plan'),
  })
  .strict();

export type OidcProvider = z.infer<typeof oidcProviderSchema>;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const configSchema = z
  .object({
    hostname: text.min(1).default('127.0.0.1'),
    port: port.default(4004),
    'cors-allow-origin': z
      .union([text, z.array(text.min(1)).min(1)])
      .default(''),
    'cors-allow-credentials': booleanSchema.default(false),
    'max-payload-bytes': positiveInt.default(64 * 1024),
    'throttle-ttl': positiveInt.default(MINUTE),
    'throttle-limit': positiveInt.default(120),
    'trusted-proxies': z.array(text.min(1)).default([]),
    'gitlab-url': z.union([z.literal(''), httpUrl]).default(''),
    'gitlab-group': text.min(1).default('DTaaS'),
    'gitlab-branch': text.min(1).default('master'),
    'gitlab-min-access-level': positiveInt.default(20),
    'gitlab-timeout': positiveInt.default(5000),
    'forwarded-user-header': text.toLowerCase().default(''),
    'gitlab-client-id': text.default(''),
    // Lets the gateway start without gitlab-client-id. Only for a local
    // development stack, never for a deployment that real users reach.
    'allow-any-gitlab-client': booleanSchema.default(false),
    'oidc-providers': z.array(oidcProviderSchema).default([]),
    // A GitLab token with read_api, kept in a file with mode 600. The gateway
    // reads the twins of a user signed in through Keycloak or Dex with it,
    // since their token cannot be sent to GitLab.
    'gitlab-token-file': text.default(''),
    'identity-cache-ttl': positiveInt.default(MINUTE),
    'projects-cache-ttl': positiveInt.default(MINUTE),
    'twin-index-cache-ttl': positiveInt.default(10 * MINUTE),
    // Short on purpose: it only spares GitLab one call per project on each
    // decision, and a new commit is seen this much later at most.
    'branch-cache-ttl': positiveInt.default(5000),
    'twins-folder': text.min(1).default('digital_twins'),
    // JSON file mapping each owner to its group and the topic prefixes of
    // that group, as dtaas-services gives the broker accounts and database:
    // {"jady": {"group": "swim", "topics": ["SWiM/"]}}.
    'owners-file': text.default(''),
    'default-channel': z.enum(CHANNELS).default('measured'),
    'max-paths-per-stream': positiveInt.default(200),
    'max-path-length': positiveInt.default(256),
    'range-max-span': positiveInt.default(7 * DAY),
  })
  .strict();

export type ConfigValues = z.infer<typeof configSchema>;
export type ConfigKey = keyof ConfigValues;

export const CONFIG_KEYS = Object.keys(configSchema.shape) as ConfigKey[];

export function envNameOf(key: string): string {
  return `SIGNALS_${key.toUpperCase().replaceAll('-', '_')}`;
}
