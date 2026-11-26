import type { CHANNELS } from '../extension/constants';

/** Which value of a signal: what was measured, simulated, predicted or asked for. */
export type Channel = (typeof CHANNELS)[number];

export type SignalValue = number | string | boolean | number[];

export type SignalQuality = 'good' | 'stale' | 'bad';

/** The one event shape every transport normalises to (layer 1). */
export interface SignalSample {
  readonly twinId: string;
  /** Slash-separated path, e.g. `ward3/ahu1/supplyTemp`. */
  readonly signalPath: string;
  readonly channel: Channel;
  /** Epoch milliseconds, assigned by the source. */
  readonly ts: number;
  readonly value: SignalValue;
  readonly quality?: SignalQuality;
  /**
   * The unit the source gave with the value, such as `Cel` or `%`, when it
   * gave one. A kit compares it with the unit it expects instead of assuming
   * one from the name of the quantity.
   */
  readonly unit?: string;
}

/** A value read from the temporal store at a playhead position. */
export interface Sampled {
  readonly value: SignalValue;
  readonly ts: number;
  readonly quality?: SignalQuality;
  /** The unit the source gave with the value, when it gave one. */
  readonly unit?: string;
}

export type SignalSink = (sample: SignalSample) => void;

/** A layer-1 source adapter. Owned by the common core, never by a kit. */
export interface TransportAdapter {
  readonly id: string;
  connect(config: unknown): Promise<void>;
  subscribe(paths: string[], sink: SignalSink): () => void;
  range?(paths: string[], from: number, to: number): Promise<SignalSample[]>;
  disconnect(): Promise<void>;
}
