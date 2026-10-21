/**
 * What a live transport offers the signals service (layer 1).
 *
 * The service asks a transport for the samples of some paths and watches its
 * connection state, so a page can tell a quiet sensor from a dead connection.
 */

import type {
  ConnectionState,
  SignalSink,
} from '@into-cps-association/dtaas-sdk';

/** A source of samples whose connection state the core can watch. */
export interface LiveTransport {
  readonly id: string;
  subscribe(paths: readonly string[], sink: SignalSink): () => void;
  state(): ConnectionState;
  onState(listener: () => void): () => void;
  close(): void;
}
