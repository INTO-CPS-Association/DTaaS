import type { SignalTarget } from '../authz/policy.js';
import type {
  BrokerMessage,
  BrokerSubscription,
  SignalBroker,
} from '../broker/broker.js';
import { topicToRoutingKey } from '../broker/routing-key.js';
import type SseWriter from './sse-writer.js';

export type SessionOptions = {
  retryMs: number;
  keepAliveMs: number;
  lifetimeMs: number;
  maxMessageBytes: number;
};

function byVhost(
  targets: readonly SignalTarget[],
): Map<string, SignalTarget[]> {
  const groups = new Map<string, SignalTarget[]>();
  targets.forEach((target) => {
    groups.set(target.vhost, [...(groups.get(target.vhost) ?? []), target]);
  });
  return groups;
}

/** One open stream: the allowed signals of one request, until it ends. */
export default class StreamSession {
  readonly done: Promise<void>;
  private readonly subscriptions: BrokerSubscription[] = [];
  private readonly timers: NodeJS.Timeout[] = [];
  private ended = false;
  private finish: () => void = () => undefined;

  constructor(
    private readonly sse: SseWriter,
    private readonly broker: SignalBroker,
    private readonly targets: readonly SignalTarget[],
    private readonly options: SessionOptions,
  ) {
    this.done = new Promise((resolve) => {
      this.finish = resolve;
    });
  }

  async start(refused: readonly string[]): Promise<void> {
    this.sse.open(this.options.retryMs);
    this.sse.event('state', { state: 'connecting' });
    if (refused.length > 0) this.sse.event('refused', { paths: refused });
    this.startTimers();
    try {
      const groups = [...byVhost(this.targets)];
      await Promise.all(
        groups.map(([vhost, group]) => this.bind(vhost, group)),
      );
    } catch {
      this.down();
      return;
    }
    if (!this.ended) this.sse.event('state', { state: 'live' });
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.subscriptions.forEach((subscription) => {
      subscription.close().catch(() => undefined);
    });
    this.sse.end();
    this.finish();
  }

  private startTimers(): void {
    const keepAlive = setInterval(
      () => this.sse.comment('keep-alive'),
      this.options.keepAliveMs,
    );
    const lifetime = setTimeout(
      () => this.end(),
      Math.max(0, this.options.lifetimeMs),
    );
    this.timers.push(keepAlive, lifetime);
  }

  private async bind(
    vhost: string,
    group: readonly SignalTarget[],
  ): Promise<void> {
    const byKey = new Map(
      group.map((target) => [topicToRoutingKey(target.path), target]),
    );
    const subscription = await this.broker.subscribe(vhost, [...byKey.keys()], {
      onMessage: (message) =>
        this.forward(byKey.get(message.routingKey), message),
      onDown: () => this.down(),
    });
    // The stream may have ended while this vhost was still binding.
    if (this.ended) await subscription.close().catch(() => undefined);
    else this.subscriptions.push(subscription);
  }

  private forward(
    target: SignalTarget | undefined,
    message: BrokerMessage,
  ): void {
    if (target === undefined || this.ended) return;
    if (message.body.length > this.options.maxMessageBytes) return;
    if (this.sse.isCongested()) return;
    this.sse.event('sample', {
      path: target.path,
      channel: target.channel,
      receivedAt: Date.now(),
      payload: message.body.toString('utf8'),
    });
  }

  private down(): void {
    if (this.ended) return;
    this.sse.event('state', { state: 'down' });
    this.end();
  }
}
