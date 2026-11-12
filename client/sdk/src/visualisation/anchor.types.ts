import type { z } from 'zod';
import type { STANDARD_ANCHOR_KINDS } from '../extension/constants';
import type { anchorSchema } from '../schema/anchor.schema';

export type StandardAnchorKind = (typeof STANDARD_ANCHOR_KINDS)[number];

/** A standard kind, or a domain kind contributed by a kit (e.g. `turbine`). */
// The intersection keeps editor completion for the standard kinds.
export type AnchorKind = StandardAnchorKind | (string & {});

/** Ties a signal to a location on a substrate (layer 3). */
export type Anchor = z.infer<typeof anchorSchema>;
