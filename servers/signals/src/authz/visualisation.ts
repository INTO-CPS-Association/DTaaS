import { z } from 'zod';
import { isPlainTopic } from '../broker/routing-key.js';
import fillTemplate from '../config/template.js';
import { CHANNELS, type InfluxSource, type SignalTarget } from './policy.js';

const fileSchema = z.object({ transports: z.array(z.unknown()).default([]) });

const mqttSchema = z.object({
  adapter: z.literal('mqtt'),
  topics: z.array(z.string()),
  channel: z.enum(CHANNELS).optional(),
});

const influxSchema = z.object({
  adapter: z.literal('influx'),
  org: z.string().min(1),
  bucket: z.string().min(1),
  measurement: z.string().min(1).optional(),
});

export type TwinContext = {
  owner: string;
  twin: string;
  vhost: string;
  orgTemplate: string;
  bucketTemplate: string;
  maxPathLength: number;
  warn: (message: string) => void;
};

function influxOf(transports: unknown[], context: TwinContext) {
  const declared = transports
    .map((transport) => influxSchema.safeParse(transport))
    .find((parsed) => parsed.success)?.data;
  if (declared === undefined) return undefined;
  const org = fillTemplate(context.orgTemplate, context.owner);
  const bucket = fillTemplate(context.bucketTemplate, context.owner);
  // A twin may only name its owner's own org and bucket. Anything else would
  // let a twin file read another user's history with the gateway's token.
  if (declared.org !== org || declared.bucket !== bucket) {
    context.warn(
      `Ignored the influx transport of ${context.owner}/${context.twin}: org or bucket is not the owner's`,
    );
    return undefined;
  }
  const source: InfluxSource = { org, bucket };
  if (declared.measurement !== undefined)
    source.measurement = declared.measurement;
  return source;
}

function targetsOf(
  transport: z.infer<typeof mqttSchema>,
  context: TwinContext,
  influx: InfluxSource | undefined,
): SignalTarget[] {
  return transport.topics
    .filter((topic) => isPlainTopic(topic, context.maxPathLength))
    .map((path) => ({
      path,
      owner: context.owner,
      twin: context.twin,
      channel: transport.channel ?? 'measured',
      vhost: context.vhost,
      ...(influx === undefined ? {} : { influx }),
    }));
}

/** The signals one committed visualisation.json declares. */
export function signalsOfVisualisation(
  raw: unknown,
  context: TwinContext,
): SignalTarget[] {
  const file = fileSchema.safeParse(raw);
  if (!file.success) return [];
  const { transports } = file.data;
  const influx = influxOf(transports, context);
  return transports.flatMap((transport) => {
    const mqtt = mqttSchema.safeParse(transport);
    return mqtt.success ? targetsOf(mqtt.data, context, influx) : [];
  });
}
