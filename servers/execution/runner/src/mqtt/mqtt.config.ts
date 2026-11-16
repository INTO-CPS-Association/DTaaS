import type { IClientOptions } from 'mqtt';
import { z } from 'zod';
import Signer from '../auth/signer.js';
import { NotifyKind, offlineNotification } from '../dto/notify.dto.js';

// A base topic is a prefix for the request topics, so it can not hold
// wildcards, start in the reserved $ space or end with a separator.
export const baseTopic = z
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

export const mqttRoutes = [
  'execute',
  'status',
  'history',
  'transition',
  'event',
  'fsm',
  'dt',
  'state',
  'health',
  'stop',
  'parameters',
  'set-parameters',
  'escalate',
  'metrics',
  'peers',
  'set-peers',
] as const;

export type MqttRoute = (typeof mqttRoutes)[number];

export const requestTopic = (base: string, route: MqttRoute): string =>
  `${base}/${route}`;

export const defaultResponseTopic = (topic: string): string =>
  `${topic}/response`;

// A broker drops a client that publishes to an empty, wildcard or $
// topic, so a response topic of a request must be a plain topic name.
export const isPublishableTopic = (topic: string): boolean =>
  /^[^$#+][^#+]*$/.test(topic);

// Notifications go two levels under the base topic, so that they can
// not be taken for requests
export const notifyTopic = (base: string, kind: NotifyKind): string =>
  `${base}/notify/${kind}`;

// The broker publishes the will when the runner disappears without
// disconnecting; retained, it replaces the online notice. It is encoded
// once, at connect, and stays valid across reconnects.
export const presenceWill = (
  base: string,
  id: string,
  signer: Signer,
): IClientOptions['will'] => ({
  topic: notifyTopic(base, 'presence'),
  payload: signer.encode(offlineNotification(id, null)),
  qos: 1,
  retain: true,
});

export const clientOptions = (
  options: MqttConfig,
  id: string,
  signer: Signer,
): IClientOptions => ({
  username: options.username,
  password: options.password,
  protocolVersion: options.protocolVersion,
  // keep retrying after the broker refuses the connection too
  reconnectOnConnackError: true,
  will: presenceWill(options.topic, id, signer),
});
