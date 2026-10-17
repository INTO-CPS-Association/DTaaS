import { z } from 'zod';

// A base topic is a prefix for the request topics, so it can not hold
// wildcards, start in the reserved $ space or end with a separator.
const baseTopic = z
  .string()
  .regex(
    /^[^$#+]([^#+]*[^#+/])?$/,
    'must not contain wildcards, start with $ or end with /',
  );

export const mqttConfigSchema = z
  .object({
    url: z.url({ protocol: /^(mqtt|mqtts|ws|wss)$/ }),
    topic: baseTopic,
    username: z.string().optional(),
    password: z.string().optional(),
    protocolVersion: z.union([z.literal(4), z.literal(5)]).default(5),
  })
  .strict();

export type MqttConfig = z.infer<typeof mqttConfigSchema>;

export const mqttRoutes = ['execute', 'status', 'history'] as const;

export type MqttRoute = (typeof mqttRoutes)[number];

export const requestTopic = (base: string, route: MqttRoute): string =>
  `${base}/${route}`;

export const defaultResponseTopic = (topic: string): string =>
  `${topic}/response`;

// A broker drops a client that publishes to an empty, wildcard or $
// topic, so a response topic of a request must be a plain topic name.
export const isPublishableTopic = (topic: string): boolean =>
  /^[^$#+][^#+]*$/.test(topic);
