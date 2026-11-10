import type { z } from 'zod';
import type { Channel } from '../visualisation/signal.types';
import type { encodingSchema } from './encoding.schema';
import type { transportSchema } from './transport.schema';

type Transport = z.infer<typeof transportSchema>;
type Encoding = z.infer<typeof encodingSchema>;

interface Binding {
  readonly target: string;
  readonly encoding?: Encoding;
  readonly preset?: string;
}

/** The channel a transport or an encoding uses when it names none. */
const DEFAULT_CHANNEL: Channel = 'measured';

/** What one transport delivers. */
interface Provider {
  readonly channel: Channel;
  /** Topic filters, or `undefined` when the transport can carry any path. */
  readonly topics?: readonly string[];
}

/** One signal an encoding reads, and the field of the binding that asks for it. */
interface Need {
  /** `undefined` when any channel will do, as for a preset binding. */
  readonly channel?: Channel;
  readonly path: (string | number)[];
}

const providerOf = (transport: Transport): Provider => {
  const channel =
    transport.adapter === 'influx' ? undefined : transport.channel;
  // An MQTT topic is the signal path, so only an MQTT transport lists its
  // paths. The other adapters name entities, buckets or files, whose signal
  // paths are known only once the host reads them.
  const topics = transport.adapter === 'mqtt' ? transport.topics : undefined;
  return { channel: channel ?? DEFAULT_CHANNEL, topics };
};

/** MQTT topic filter matching: `+` is one level, `#` is the rest. */
export const matchesTopic = (filter: string, signalPath: string) => {
  const levels = filter.split('/');
  const parts = signalPath.split('/');
  for (let i = 0; i < levels.length; i += 1) {
    if (levels[i] === '#') return true;
    if (i >= parts.length) return false;
    if (levels[i] !== '+' && levels[i] !== parts[i]) return false;
  }
  return levels.length === parts.length;
};

const provides = (provider: Provider, signalPath: string, channel?: Channel) =>
  (channel === undefined || provider.channel === channel) &&
  (provider.topics === undefined ||
    provider.topics.some((topic) => matchesTopic(topic, signalPath)));

/** The signals one binding reads, each with the field that names it. */
const needsOf = (binding: Binding, i: number): Need[] => {
  const at = (...field: string[]) => ['encodings', i, ...field];
  const { encoding } = binding;
  if (encoding === undefined) return [{ path: at('target') }];
  if (encoding.type === 'residual') {
    return [
      { channel: DEFAULT_CHANNEL, path: at('target') },
      { channel: encoding.against, path: at('encoding', 'against') },
    ];
  }
  const named = encoding.type === 'ghost' || encoding.type === 'colorScale';
  if (named && encoding.channel !== undefined) {
    return [{ channel: encoding.channel, path: at('encoding', 'channel') }];
  }
  return [{ channel: DEFAULT_CHANNEL, path: at('target') }];
};

const nameOf = (binding: Binding, i: number) =>
  binding.encoding === undefined
    ? `encodings[${i}] (preset "${binding.preset}")`
    : `encodings[${i}] (${binding.encoding.type})`;

const missingText = (binding: Binding, i: number, need: Need) => {
  const signal = `signal "${binding.target}"`;
  const wanted =
    need.channel === undefined
      ? signal
      : `${signal} on channel "${need.channel}"`;
  return `${nameOf(binding, i)} reads ${wanted}, which no transport provides`;
};

/**
 * Every signal an encoding reads, on the channel it reads it, must come from
 * at least one declared transport. Otherwise the binding renders nothing and
 * nothing tells the author why.
 */
export const checkCoverage = (
  transports: readonly Transport[],
  bindings: readonly Binding[],
  ctx: z.RefinementCtx,
) => {
  const providers = transports.map(providerOf);
  bindings.forEach((binding, i) => {
    needsOf(binding, i).forEach((need) => {
      const found = providers.some((p) =>
        provides(p, binding.target, need.channel),
      );
      if (!found) {
        ctx.addIssue({
          code: 'custom',
          path: need.path,
          message: missingText(binding, i, need),
        });
      }
    });
  });
};
