import { z } from 'zod';
import { CHANNELS } from './policy.js';

/*
A copy of the transport part of the visualisation.json contract, from
client/sdk/src/schema (common.schema.ts, url.schema.ts, transport.schema.ts).
The gateway is built and shipped on its own, with servers/signals as the
Docker build context, so it cannot import the SDK source. Change both
together: test/unit/visualisation.spec.ts checks that the gateway accepts the
SDK's own example file, copied to test/fixtures until the SDK is in this
repository. The layout, substrates, anchors and encodings are not
copied, since the gateway reads nothing from them.
*/

const MAX_STRING_LENGTH = 2048;
const MAX_LIST_LENGTH = 1000;

const text = z.string().max(MAX_STRING_LENGTH);
const nonEmpty = text.min(1);
const listOf = <T extends z.ZodType>(item: T) =>
  z.array(item).max(MAX_LIST_LENGTH);
const channel = z.enum(CHANNELS).optional();
const names = listOf(nonEmpty).min(1);

const RELATIVE_BASE = 'https://relative.invalid/';
const RELATIVE_ORIGIN = new URL(RELATIVE_BASE).origin;

type UrlRule = { schemes: readonly string[]; relative?: boolean };

function absoluteUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function staysOnHost(value: string): boolean {
  try {
    return new URL(value, RELATIVE_BASE).origin === RELATIVE_ORIGIN;
  } catch {
    return false;
  }
}

function isAllowed(value: string, rule: UrlRule): boolean {
  const url = absoluteUrl(value);
  if (url === undefined) return rule.relative === true && staysOnHost(value);
  return rule.schemes.includes(url.protocol.slice(0, -1));
}

// A file anyone with access to the repository can read is no place for a
// password, so a URL with a user name or password is refused.
function hasNoCredentials(value: string): boolean {
  const url = absoluteUrl(value);
  return url === undefined || (url.username === '' && url.password === '');
}

const urlSchema = (rule: UrlRule) =>
  nonEmpty
    .refine((value) => isAllowed(value, rule), {
      message: `Expected a URL with scheme ${rule.schemes.join(', ')}`,
    })
    .refine(hasNoCredentials, {
      message: 'A URL must not carry a user name or password',
    });

const brokerUrl = urlSchema({ schemes: ['ws', 'wss', 'mqtt', 'mqtts'] });
const httpUrl = urlSchema({ schemes: ['http', 'https'] });
const thingsboardUrl = urlSchema({ schemes: ['http', 'https', 'ws', 'wss'] });
const fileUrl = urlSchema({
  schemes: ['http', 'https', 'lib'],
  relative: true,
});

export const mqttSchema = z.object({
  adapter: z.literal('mqtt'),
  url: brokerUrl,
  topics: names,
  channel,
  qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

const influxSchema = z.object({
  adapter: z.literal('influx'),
  url: httpUrl.optional(),
  org: nonEmpty,
  bucket: nonEmpty,
  measurement: nonEmpty.optional(),
  role: z.literal('history').optional(),
});

const transportSchema = z.discriminatedUnion('adapter', [
  mqttSchema,
  z.object({
    adapter: z.literal('stomp'),
    url: brokerUrl,
    destinations: names,
    channel,
  }),
  z.object({
    adapter: z.literal('thingsboard'),
    url: thingsboardUrl,
    entityIds: names,
    keys: names.optional(),
    channel,
  }),
  influxSchema,
  z.object({
    adapter: z.literal('http'),
    url: httpUrl,
    method: z.enum(['GET', 'POST']).optional(),
    intervalMs: z.number().positive().optional(),
    channel,
  }),
  z.object({
    adapter: z.literal('file'),
    url: fileUrl,
    format: z.enum(['csv', 'parquet', 'json']).optional(),
    channel,
  }),
]);

export type Transport = z.infer<typeof transportSchema>;

/** The parts of a visualisation.json the gateway reads, as the SDK checks them. */
export const declarationSchema = z.looseObject({
  schemaVersion: text.regex(/^1\.\d+$/, 'Only schema version 1.x'),
  transports: listOf(transportSchema).default([]),
});
