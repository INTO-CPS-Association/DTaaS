import { z } from 'zod';
import { publicKeySchema } from '../auth/auth.config.js';
import { attributesSchema } from '../config/attributes.js';
import { nameSchema } from '../fsm/name.js';
import { baseTopic } from '../mqtt/mqtt.config.js';

// A peer that the DT is willing to interact with: its MQTT base topic
// on the runner's own broker, its HTTP base URL, or both. The runner
// never reads its attributes, such as a distance.
const peerSchema = z
  .object({
    id: nameSchema,
    topic: baseTopic.optional(),
    url: z.url({ protocol: /^https?$/ }).optional(),
    attributes: attributesSchema.default({}),
    enabled: z.boolean().default(true),
    // the key that signs the peer's notices, in the encoding of auth
    publicKey: publicKeySchema.optional(),
  })
  .strict()
  .refine((peer) => peer.topic !== undefined || peer.url !== undefined, {
    message: 'needs a topic or a url',
  });

export type PeerConfig = z.infer<typeof peerSchema>;

// The indexes of the values that an earlier one repeats
const repeats = (values: (string | undefined)[]): number[] =>
  values.flatMap((value, index) =>
    value !== undefined && values.indexOf(value) < index ? [index] : [],
  );

// Peers are told apart by id and followed by topic, so both are unique
function duplicates(peers: PeerConfig[], context: z.RefinementCtx): void {
  repeats(peers.map(({ id }) => id)).forEach((index) => {
    const message = `duplicate peer ${peers[index].id}`;
    context.addIssue({ code: 'custom', message, path: [index, 'id'] });
  });
  repeats(peers.map(({ topic }) => topic)).forEach((index) => {
    const message = `duplicate peer topic ${peers[index].topic}`;
    context.addIssue({ code: 'custom', message, path: [index, 'topic'] });
  });
}

export const peersSchema = z.array(peerSchema).superRefine(duplicates);

// The id and base topic of the runner, which no peer may take
export type Own = { id: string; topic?: string };

const SELF = 'is the runner itself';

// The indexes of the values equal to the given one, if it is defined
const indexesOf = (values: (string | undefined)[], value?: string) =>
  values.flatMap((each, index) =>
    value !== undefined && each === value ? [index] : [],
  );

export function refuseSelf(
  peers: PeerConfig[],
  own: Own,
  context: z.RefinementCtx,
): void {
  (['id', 'topic'] as const).forEach((key) =>
    indexesOf(
      peers.map((peer) => peer[key]),
      own[key],
    ).forEach((index) =>
      context.addIssue({
        code: 'custom',
        message: SELF,
        path: ['peers', index, key],
      }),
    ),
  );
}
