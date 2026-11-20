import { z } from 'zod';
import { publicKeyObject } from '../auth/auth.config.js';
import { parseJws, verifyJws } from '../auth/jws.js';
import { PeerConfig } from './peers.config.js';
import { NoticeKind } from './peers.js';

// The data of a notice, null for an empty payload, or why it is dropped
export type Reading = { data: unknown } | { dropped: string };

const DATA: Record<NoticeKind, z.ZodType> = {
  presence: z.object({
    online: z.boolean(),
    descriptor: z.unknown().optional(),
  }),
  state: z.unknown(),
};

// A notification envelope (S7) of the topic's kind and the peer's id
const envelope = (kind: NoticeKind, id: string) =>
  z.object({
    kind: z.literal(kind),
    id: z.literal(id),
    time: z.string().nullable(),
    data: DATA[kind],
  });

// The result of the work, or an error that gives the reason
function attempt<T>(work: () => T, reason: string): T {
  try {
    return work();
  } catch {
    throw new Error(reason);
  }
}

// A peer with a key signs its notices as a JWS of the envelope, with its
// id as the kid, as 15b signs them
function verified(text: string, id: string, publicKey: string): unknown {
  const jws = attempt(() => parseJws(text), 'not signed');
  const keyOf = (kid: string) =>
    kid === id ? publicKeyObject(publicKey) : undefined;
  attempt(() => verifyJws(jws, keyOf), 'bad signature');
  return jws.payload;
}

// A keyless peer's notice is taken as it is, so a signed one is not
// JSON; taken unverified, it would look verified
function content({ id, publicKey }: PeerConfig, text: string): unknown {
  return publicKey === undefined
    ? attempt(() => JSON.parse(text), 'not JSON')
    : verified(text, id, publicKey);
}

// An empty payload clears a retained notice
export default function readNotice(
  peer: PeerConfig,
  kind: NoticeKind,
  payload: Buffer,
): Reading {
  if (payload.length === 0) {
    return { data: null };
  }
  try {
    const value = content(peer, payload.toString());
    const reason = `not a ${kind} notice of ${peer.id}`;
    const notice = attempt(() => envelope(kind, peer.id).parse(value), reason);
    return { data: notice.data };
  } catch (error) {
    return { dropped: (error as Error).message };
  }
}
