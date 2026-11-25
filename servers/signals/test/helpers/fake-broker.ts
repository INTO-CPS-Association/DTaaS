import type {
  BrokerListener,
  BrokerSubscription,
  SignalBroker,
} from 'src/broker/broker';

type Binding = {
  topics: readonly string[];
  listener: BrokerListener;
};

/** A payload of the naming convention, with the given value. */
export function reading(value: number): string {
  return JSON.stringify({ value, ts: '2026-11-06T10:00:00Z', unit: 'Cel' });
}

/** A broker in memory: records each subscription and delivers what a test publishes. */
export default class FakeBroker implements SignalBroker {
  readonly bindings: Binding[] = [];
  failNext = false;

  async subscribe(
    topics: readonly string[],
    listener: BrokerListener,
  ): Promise<BrokerSubscription> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('broker unreachable');
    }
    const binding = { topics, listener };
    this.bindings.push(binding);
    return {
      close: async () => {
        const index = this.bindings.indexOf(binding);
        if (index >= 0) this.bindings.splice(index, 1);
      },
    };
  }

  publish(topic: string, text: string): void {
    this.bindings
      .filter((b) => b.topics.includes(topic))
      .forEach((b) => b.listener.onMessage({ topic, body: Buffer.from(text) }));
  }

  dropAll(): void {
    [...this.bindings].forEach((b) => b.listener.onDown());
  }
}
