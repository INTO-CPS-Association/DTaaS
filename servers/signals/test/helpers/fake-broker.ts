import type {
  BrokerListener,
  BrokerSubscription,
  SignalBroker,
} from 'src/broker/broker';

type Binding = {
  vhost: string;
  keys: readonly string[];
  listener: BrokerListener;
};

/** A broker in memory: records each binding and delivers what a test publishes. */
export default class FakeBroker implements SignalBroker {
  readonly bindings: Binding[] = [];
  failNext = false;

  async subscribe(
    vhost: string,
    keys: readonly string[],
    listener: BrokerListener,
  ): Promise<BrokerSubscription> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('broker unreachable');
    }
    const binding = { vhost, keys, listener };
    this.bindings.push(binding);
    return {
      close: async () => {
        const index = this.bindings.indexOf(binding);
        if (index >= 0) this.bindings.splice(index, 1);
      },
    };
  }

  publish(vhost: string, routingKey: string, text: string): void {
    this.bindings
      .filter((b) => b.vhost === vhost && b.keys.includes(routingKey))
      .forEach((b) =>
        b.listener.onMessage({ routingKey, body: Buffer.from(text) }),
      );
  }

  dropAll(): void {
    [...this.bindings].forEach((b) => b.listener.onDown());
  }
}
