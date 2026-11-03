import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { Identity } from '../auth/identity.service.js';
import type { PathDecision } from '../authz/access.service.js';
import { SIGNAL_BROKER, type SignalBroker } from '../broker/broker.js';
import Config from '../config/config.service.js';
import SseWriter from './sse-writer.js';
import StreamSession from './stream-session.js';

/** Runs a stream until the client leaves, its age runs out or the token expires. */
@Injectable()
export default class StreamService {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    @Inject(SIGNAL_BROKER) private readonly broker: SignalBroker,
  ) {} // eslint-disable-line no-empty-function

  async run(
    response: Response,
    identity: Identity,
    decision: PathDecision,
  ): Promise<void> {
    const session = new StreamSession(
      new SseWriter(response),
      this.broker,
      decision.allowed,
      {
        retryMs: this.config.get('retry-interval'),
        keepAliveMs: this.config.get('keep-alive-interval'),
        lifetimeMs: this.lifetimeOf(identity),
        maxMessageBytes: this.config.get('max-message-bytes'),
      },
    );
    response.on('close', () => session.end());
    await session.start(decision.refused);
    await session.done;
  }

  private lifetimeOf(identity: Identity): number {
    const maxAge = this.config.get('stream-max-age');
    if (identity.expiresAt === undefined) return maxAge;
    return Math.min(maxAge, identity.expiresAt - Date.now());
  }
}
