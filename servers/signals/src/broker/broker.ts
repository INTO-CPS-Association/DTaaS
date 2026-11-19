export type BrokerMessage = {
  topic: string;
  body: Buffer;
};

export interface BrokerListener {
  onMessage(message: BrokerMessage): void;
  /** The connection behind this subscription is gone. No message follows. */
  onDown(): void;
}

export interface BrokerSubscription {
  close(): Promise<void>;
}

/**
 * Where live signals come from and where commands go. The gateway uses only
 * topics it has already authorised, so an implementation needs no notion of
 * users.
 */
export interface SignalBroker {
  subscribe(
    topics: readonly string[],
    listener: BrokerListener,
  ): Promise<BrokerSubscription>;
  /** Send one message with at-least-once delivery. */
  publish(topic: string, body: string): Promise<void>;
}

export const SIGNAL_BROKER = Symbol('SIGNAL_BROKER');
