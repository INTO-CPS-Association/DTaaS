import type { SignalTarget } from '../authz/policy.js';
import type {
  BrokerMessage,
  BrokerSubscription,
  SignalBroker,
} from '../broker/broker.js';
import { type DeliveryCounts, emptyCounts } from './delivery-stats.js';
import followsConvention from './payload.js';
import type SseWriter from './sse-writer.js';

export type SessionOptions = {
  retryMs: number;
  keepAliveMs: number;
  lifetimeMs: number;
  maxMessageBytes: number;
  recheckMs: number;
};

/** Asks the policy again, and answers the allowed paths now refused. */
export type Recheck = () => Promise<readonly string[]>;

/** One open stream: the allowed signals of one request, until it ends. */
export default class StreamSession {
  readonly done: Promise<void>;
  readonly counts: DeliveryCounts = emptyCounts();
  private readonly subscriptions: BrokerSubscription[] = [];
  private readonly timers: NodeJS.Timeout[] = [];
  private ended = false;
  private rechecking = false;
  private finish: () => void = () => undefined;

  constructor(
    private readonly sse: SseWriter,
    private readonly broker: SignalBroker,
    private readonly targets: readonly SignalTarget[],
    private readonly options: SessionOptions,
    private readonly recheck?: Recheck,
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
      await this.subscribe();
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
      () => this.endOfLife(),
      Math.max(0, this.options.lifetimeMs),
    );
    this.timers.push(keepAlive, lifetime);
    if (this.recheck !== undefined) {
      const recheck = setInterval(() => {
        this.recheckAccess().catch(() => this.down());
      }, this.options.recheckMs);
      this.timers.push(recheck);
    }
  }

  // Access is decided when the stream opens. A user removed from a project
  // while the stream runs would keep reading it until the stream's age runs
  // out, so the decision is asked again on an interval. A revoked path is
  // sent as refused and the stream ends, so the client reconnects without it.
  private async recheckAccess(): Promise<void> {
    if (this.rechecking || this.ended || this.recheck === undefined) return;
    this.rechecking = true;
    try {
      const revoked = await this.recheck();
      if (revoked.length > 0 && !this.ended) {
        this.sse.event('refused', { paths: revoked });
        this.down();
      }
    } finally {
      this.rechecking = false;
    }
  }

  private async subscribe(): Promise<void> {
    const byTopic = new Map(
      this.targets.map((target) => [target.path, target]),
    );
    const subscription = await this.broker.subscribe([...byTopic.keys()], {
      onMessage: (message) => this.forward(byTopic.get(message.topic), message),
      onDown: () => this.down(),
    });
    // The stream may have ended while the broker was still subscribing.
    if (this.ended) await subscription.close().catch(() => undefined);
    else this.subscriptions.push(subscription);
  }

  private forward(
    target: SignalTarget | undefined,
    message: BrokerMessage,
  ): void {
    if (target === undefined || this.ended) return;
    if (message.body.length > this.options.maxMessageBytes) {
      this.counts.dropped.tooLarge += 1;
      return;
    }
    if (!followsConvention(message.body)) {
      this.counts.dropped.invalid += 1;
      return;
    }
    if (this.sse.isCongested()) {
      this.counts.dropped.congested += 1;
      return;
    }
    this.counts.forwarded += 1;
    const receivedAt = Date.now();
    // The id is the time the gateway received the message, so a client
    // that connects again names how far it got.
    this.sse.event(
      'sample',
      {
        path: target.path,
        twin: target.twin,
        channel: target.channel,
        receivedAt,
        payload: message.body.toString('utf8'),
      },
      String(receivedAt),
    );
  }

  // A stream ends at its age on purpose, so the client may open the next
  // one at once instead of waiting as it does after a failure.
  private endOfLife(): void {
    if (this.ended) return;
    this.sse.event('end', { reason: 'lifetime' });
    this.end();
  }

  private down(): void {
    if (this.ended) return;
    this.sse.event('state', { state: 'down' });
    this.end();
  }
}
