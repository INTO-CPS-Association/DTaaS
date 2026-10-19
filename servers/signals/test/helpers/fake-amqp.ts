import { EventEmitter } from 'node:events';
import type { ChannelModel, ConsumeMessage } from 'amqplib';

/** The parts of an amqplib channel the gateway uses, recorded in memory. */
export class FakeChannel extends EventEmitter {
  readonly bound = new Set<string>();
  readonly operations: string[] = [];
  queue = '';
  failBind = false;
  private consumer?: (message: ConsumeMessage | null) => void;

  async assertQueue(queue: string, options: Record<string, unknown>) {
    this.queue = queue;
    this.operations.push(`assert ${JSON.stringify(options)}`);
    return { queue, messageCount: 0, consumerCount: 0 };
  }

  async bindQueue(_queue: string, exchange: string, key: string) {
    if (this.failBind) throw new Error('ACCESS_REFUSED');
    this.operations.push(`bind ${exchange} ${key}`);
    this.bound.add(key);
    return {};
  }

  async unbindQueue(_queue: string, exchange: string, key: string) {
    this.operations.push(`unbind ${exchange} ${key}`);
    this.bound.delete(key);
    return {};
  }

  async consume(
    _queue: string,
    onMessage: (message: ConsumeMessage | null) => void,
  ) {
    this.consumer = onMessage;
    return { consumerTag: 'tag' };
  }

  deliver(routingKey: string, text: string): void {
    this.consumer?.({
      fields: { routingKey },
      content: Buffer.from(text),
    } as ConsumeMessage);
  }

  cancel(): void {
    this.consumer?.(null);
  }
}

export class FakeModel extends EventEmitter {
  readonly channel = new FakeChannel();
  closed = false;

  async createChannel() {
    return this.channel;
  }

  async close() {
    this.closed = true;
  }

  asModel(): ChannelModel {
    return this as unknown as ChannelModel;
  }
}
