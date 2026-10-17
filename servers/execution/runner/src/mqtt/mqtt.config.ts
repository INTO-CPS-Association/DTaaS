import { z } from 'zod';

// A base topic is a prefix for the request topics, so it can not hold
// wildcards or end with a separator.
const baseTopic = z
  .string()
  .regex(/^[^#+]*[^#+/]$/, 'must not contain wildcards or end with /');

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
