import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { Identity } from '../auth/identity.service.js';
import type { PathDecision } from '../authz/access.service.js';
import { SIGNAL_BROKER, type SignalBroker } from '../broker/broker.js';
import Config from '../config/config.service.js';
import DeliveryStats from './delivery-stats.js';
import SseWriter from './sse-writer.js';
import StreamSession, {
  type Backfill,
  type Recheck,
} from './stream-session.js';

/** Runs a stream until the client leaves, its age runs out or the token expires. */
@Injectable()
export default class StreamService {
  private readonly logger = new Logger(StreamService.name);

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    @Inject(SIGNAL_BROKER) private readonly broker: SignalBroker,
    private readonly stats: DeliveryStats,
  ) {} // eslint-disable-line no-empty-function

  async run(
    response: Response,
    identity: Identity,
    decision: PathDecision,
    recheck?: Recheck,
    backfill?: Backfill,
  ): Promise<void> {
    // The client may have left while access was decided. A session opened
    // now would hold a slot and a subscription until its age runs out.
    if (response.destroyed || response.writableEnded) return;
    const startedAt = Date.now();
    const session = new StreamSession(
      new SseWriter(response, this.config.get('max-backlog-bytes')),
      this.broker,
      decision.allowed,
      this.optionsFor(identity),
      recheck,
      backfill,
    );
    response.on('close', () => session.end());
    await session.start(decision.refused);
    await session.done;
    this.stats.record(identity.id, session.counts);
    // One line per stream, with no token, so a delivery measurement can
    // read what each stream forwarded and dropped.
    this.logger.log(
      JSON.stringify({
        user: identity.username,
        action: 'stream-end',
        paths: decision.allowed.length,
        resumed: backfill !== undefined,
        durationMs: Date.now() - startedAt,
        ...session.counts,
      }),
    );
  }

  private optionsFor(identity: Identity) {
    return {
      retryMs: this.config.get('retry-interval'),
      keepAliveMs: this.config.get('keep-alive-interval'),
      lifetimeMs: this.lifetimeOf(identity),
      maxMessageBytes: this.config.get('max-message-bytes'),
      recheckMs: this.config.get('stream-recheck-interval'),
    };
  }

  private lifetimeOf(identity: Identity): number {
    const maxAge = this.config.get('stream-max-age');
    if (identity.expiresAt === undefined) return maxAge;
    return Math.min(maxAge, identity.expiresAt - Date.now());
  }
}
