import type { z } from 'zod';
import type { encodingSchema } from '../schema/encoding.schema';
import type { SignalValue } from './signal.types';

/** One rule of the layer-4 vocabulary, discriminated on `type`. */
export type Encoding = z.infer<typeof encodingSchema>;

export type EncodingType = Encoding['type'];

/** An encoding evaluated at the playhead, ready for `SubstrateAdapter.apply`. */
export interface ResolvedEncoding {
  readonly encoding: Encoding;
  readonly t: number;
  readonly value: SignalValue | undefined;
  /** Visual properties the evaluator computed, e.g. `{ color: '#ff0000' }`. */
  readonly properties: Readonly<Record<string, unknown>>;
}
