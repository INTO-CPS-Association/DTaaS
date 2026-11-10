import { z } from 'zod';
import { channelSchema, listOf, nonEmpty } from './common.schema';
import { urlSchema } from './url.schema';

const channel = channelSchema.optional();
const names = listOf(nonEmpty).min(1);

/** Brokers speak MQTT or STOMP over a WebSocket, or MQTT over TCP. */
const brokerUrl = urlSchema({ schemes: ['ws', 'wss', 'mqtt', 'mqtts'] });
const httpUrl = urlSchema({ schemes: ['http', 'https'] });
/** ThingsBoard serves REST over HTTP and telemetry over a WebSocket. */
const thingsboardUrl = urlSchema({ schemes: ['http', 'https', 'ws', 'wss'] });
/** A file is fetched over HTTP, or from the library through `lib://` or a path. */
const fileUrl = urlSchema({
  schemes: ['http', 'https', 'lib'],
  relative: true,
});

const mqtt = z.object({
  adapter: z.literal('mqtt'),
  // Optional: a host with a signals gateway serves the topics itself, so a
  // declaration can name the topics it reads and leave the broker to the host.
  url: brokerUrl.optional(),
  topics: names,
  channel,
  qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
});

const stomp = z.object({
  adapter: z.literal('stomp'),
  url: brokerUrl,
  destinations: names,
  channel,
});

const thingsboard = z.object({
  adapter: z.literal('thingsboard'),
  url: thingsboardUrl,
  entityIds: names,
  keys: names.optional(),
  channel,
});

const influx = z.object({
  adapter: z.literal('influx'),
  url: httpUrl.optional(),
  org: nonEmpty,
  bucket: nonEmpty,
  measurement: nonEmpty.optional(),
  role: z.literal('history').optional(),
});

const http = z.object({
  adapter: z.literal('http'),
  url: httpUrl,
  method: z.enum(['GET', 'POST']).optional(),
  intervalMs: z.number().positive().optional(),
  channel,
});

const file = z.object({
  adapter: z.literal('file'),
  url: fileUrl,
  format: z.enum(['csv', 'parquet', 'json']).optional(),
  channel,
});

/** Where a visualisation's signals come from (layer 1), per the installed stack. */
export const transportSchema = z.discriminatedUnion('adapter', [
  mqtt,
  stomp,
  thingsboard,
  influx,
  http,
  file,
]);

export default transportSchema;
