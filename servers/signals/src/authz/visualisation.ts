import type { z } from 'zod';
import isPlainTopic from '../topic.js';
import {
  declarationSchema,
  type mqttSchema,
  type Transport,
} from './contract.schema.js';
import type { Channel, SignalTarget } from './policy.js';

// The gateway serves the MQTT topics a twin declares. The other transports
// of the contract are valid, and served by the client.
const SERVED_ADAPTERS: ReadonlySet<string> = new Set(['mqtt']);

export type TwinContext = {
  owner: string;
  twin: string;
  maxPathLength: number;
  defaultChannel: Channel;
  warn: (message: string) => void;
  log: (message: string) => void;
};

function targetsOf(
  transport: z.infer<typeof mqttSchema>,
  context: TwinContext,
): SignalTarget[] {
  return transport.topics
    .filter((topic) => isPlainTopic(topic, context.maxPathLength))
    .map((path) => ({
      path,
      owner: context.owner,
      twin: context.twin,
      channel: transport.channel ?? context.defaultChannel,
    }));
}

function logUnserved(transports: Transport[], context: TwinContext): void {
  const unserved = transports
    .map((transport) => transport.adapter)
    .filter((adapter) => !SERVED_ADAPTERS.has(adapter));
  if (unserved.length === 0) return;
  context.log(
    `Not serving the ${[...new Set(unserved)].join(', ')} transports of ${context.owner}/${context.twin}: the gateway serves mqtt`,
  );
}

/**
 * The signals one committed visualisation.json declares. A file the contract
 * rejects declares nothing, as the client refuses to draw it.
 */
export function signalsOfVisualisation(
  raw: unknown,
  context: TwinContext,
): SignalTarget[] {
  const file = declarationSchema.safeParse(raw);
  if (!file.success) {
    const issue = file.error.issues[0];
    context.warn(
      `Skipped ${context.owner}/${context.twin}: visualisation.json is not valid at ${issue.path.join('.')}: ${issue.message}`,
    );
    return [];
  }
  const { transports } = file.data;
  logUnserved(transports, context);
  return transports.flatMap((transport) =>
    transport.adapter === 'mqtt' ? targetsOf(transport, context) : [],
  );
}
