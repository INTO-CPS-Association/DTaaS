import { randomUUID } from 'node:crypto';
import type { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import BindingTable from './binding-table.js';
import type { BrokerListener } from './broker.js';

/** Opens an AMQP connection to one virtual host as the service user. */
export type Connector = (vhost: string) => Promise<ChannelModel>;

export const EXCHANGE = 'amq.topic';
export const QUEUE_PREFIX = 'dtaas-signals.';

type LinkSession = { model: ChannelModel; channel: Channel; queue: string };

export class LinkClosedError extends Error {
  constructor() {
    super('The broker link is closed');
  }
}

function ignore(): void {
  // The 'close' event that follows an 'error' is what the link acts on.
}

/**
 * One AMQP connection to one virtual host, with one exclusive auto-delete
 * queue. Every stream that reads this vhost shares it. The queue is gone as
 * soon as the connection is, so nothing is left behind on the broker.
 */
export default class VhostLink {
  private readonly table = new BindingTable<BrokerListener>();
  private session?: Promise<LinkSession>;
  private chain: Promise<unknown> = Promise.resolve();
  private closed = false;

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly vhost: string,
    private readonly connect: Connector,
    private readonly onGone: () => void,
  ) {} // eslint-disable-line no-empty-function

  add(keys: readonly string[], listener: BrokerListener): Promise<void> {
    return this.serial(async () => {
      if (this.closed) throw new LinkClosedError();
      try {
        const { channel, queue } = await this.open();
        for (const key of keys) {
          if (this.table.add(key, listener)) {
            await channel.bindQueue(queue, EXCHANGE, key);
          }
        }
      } catch (error) {
        keys.forEach((key) => this.table.remove(key, listener));
        // A link that never opened is dropped, so the next stream retries.
        if (this.table.isEmpty()) await this.close();
        throw error;
      }
    });
  }

  remove(keys: readonly string[], listener: BrokerListener): Promise<void> {
    return this.serial(async () => {
      if (this.closed || this.session === undefined) return;
      const { channel, queue } = await this.session;
      for (const key of keys) {
        if (this.table.remove(key, listener)) {
          await channel.unbindQueue(queue, EXCHANGE, key);
        }
      }
      if (this.table.isEmpty()) await this.close();
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.table.clear();
    this.onGone();
    const session = await this.session?.catch(() => undefined);
    await session?.model.close().catch(ignore);
  }

  // Bindings change one at a time, so an unbind never overtakes the bind of
  // the same key from a stream that opened just before.
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.chain.then(task, task);
    this.chain = next.catch(ignore);
    return next;
  }

  private open(): Promise<LinkSession> {
    this.session ??= this.start();
    return this.session;
  }

  private async start(): Promise<LinkSession> {
    const model = await this.connect(this.vhost);
    model.on('error', ignore);
    model.on('close', () => this.fail());
    try {
      return await this.prepare(model);
    } catch (error) {
      await model.close().catch(ignore);
      throw error;
    }
  }

  private async prepare(model: ChannelModel): Promise<LinkSession> {
    const channel = await model.createChannel();
    channel.on('error', ignore);
    channel.on('close', () => this.fail());
    const { queue } = await channel.assertQueue(QUEUE_PREFIX + randomUUID(), {
      exclusive: true,
      autoDelete: true,
      durable: false,
    });
    await channel.consume(queue, (message) => this.dispatch(message), {
      noAck: true,
    });
    return { model, channel, queue };
  }

  private dispatch(message: ConsumeMessage | null): void {
    // A null message means the broker cancelled the consumer.
    if (message === null) {
      this.fail();
      return;
    }
    const { routingKey } = message.fields;
    this.table
      .listenersOf(routingKey)
      .forEach((listener) =>
        listener.onMessage({ routingKey, body: message.content }),
      );
  }

  private fail(): void {
    if (this.closed) return;
    const listeners = this.table.allListeners();
    this.closed = true;
    this.table.clear();
    this.onGone();
    listeners.forEach((listener) => listener.onDown());
    this.session?.then((session) => session.model.close()).catch(ignore);
  }
}
