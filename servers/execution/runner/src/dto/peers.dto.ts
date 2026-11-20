import { z } from 'zod';
import { Attributes } from '../config/attributes.js';

// The body of PUT /peers: peer ids and whether to enable each. The
// values are checked by Peers, so that every problem can be named.
export const peersBodySchema = z.record(z.string(), z.unknown());

export type PeersBody = z.infer<typeof peersBodySchema>;

// A peer in GET /peers: what runner.yaml lists, whether it is enabled,
// and what its notices said. online, descriptor and state are null
// until a notice tells them; the runner does not check their shape.
export type PeerDto = {
  topic: string | null;
  url: string | null;
  attributes: Attributes;
  enabled: boolean;
  online: boolean | null;
  descriptor: unknown;
  state: unknown;
};

export type PeersDto = Record<string, PeerDto>;
