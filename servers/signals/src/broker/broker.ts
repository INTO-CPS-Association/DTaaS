export type BrokerMessage = {
  routingKey: string;
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
 * Where live signals come from. The gateway binds only routing keys it has
 * already authorised, so an implementation needs no notion of users.
 */
export interface SignalBroker {
  subscribe(
    vhost: string,
    routingKeys: readonly string[],
    listener: BrokerListener,
  ): Promise<BrokerSubscription>;
}

export const SIGNAL_BROKER = Symbol('SIGNAL_BROKER');
