import {
  BadGatewayException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import SignalsAuthGuard, {
  type AuthenticatedRequest,
  userOf,
} from './auth/auth.guard.js';
import AccessService, { type PathDecision } from './authz/access.service.js';
import type { Action, Subject } from './authz/policy.js';
import Config from './config/config.service.js';
import { parseRangeRequest, parseStreamRequest } from './dto/requests.js';
import HistoryService, {
  type HistoryAnswer,
} from './history/history.service.js';
import DeliveryStats, { type DeliveryCounts } from './stream/delivery-stats.js';
import StreamService from './stream/stream.service.js';
import StreamSlots from './stream/stream-slots.js';

function subjectOf(request: AuthenticatedRequest): Subject {
  const user = userOf(request);
  const { id, username, owners } = user.identity;
  return { id, username, token: user.token, owners };
}

// Stream serves live samples as server-sent events and range serves past
// samples as JSON, both behind the sign-in and the access decision.
@Controller('signals')
export default class SignalsController {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly access: AccessService,
    private readonly streams: StreamService,
    private readonly slots: StreamSlots,
    private readonly stats: DeliveryStats,
    private readonly history: HistoryService,
  ) {} // eslint-disable-line no-empty-function

  @Get('health')
  @SkipThrottle()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Post('stream')
  @UseGuards(SignalsAuthGuard)
  async stream(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ): Promise<void> {
    const paths = parseStreamRequest(body, this.pathLimits());
    const subject = subjectOf(request);
    const release = this.slots.acquire(subject.id);
    try {
      const decision = await this.authorise(subject, 'stream', paths);
      const allowed = decision.allowed.map((target) => target.path);
      const recheck = async () =>
        (await this.access.decide(subject, 'stream', allowed)).refused;
      const { identity } = userOf(request);
      await this.streams.run(response, identity, decision, recheck);
    } finally {
      release();
    }
  }

  /** What the user's ended streams forwarded and dropped, since startup. */
  @Get('stats')
  @UseGuards(SignalsAuthGuard)
  deliveryStats(@Req() request: AuthenticatedRequest): DeliveryCounts {
    return this.stats.of(userOf(request).identity.id);
  }

  @Post('range')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SignalsAuthGuard)
  async range(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<HistoryAnswer> {
    const limits = {
      ...this.pathLimits(),
      maxSpan: this.config.get('range-max-span'),
    };
    const { paths, ...span } = parseRangeRequest(body, limits);
    const decision = await this.authorise(subjectOf(request), 'range', paths);
    try {
      return await this.history.range(decision.allowed, span);
    } catch {
      // The database's own message may name a host or a role, so the client
      // gets no detail.
      throw new BadGatewayException();
    }
  }

  // Nothing the user may read is refused before any work is done.
  private async authorise(
    subject: Subject,
    action: Action,
    paths: string[],
  ): Promise<PathDecision> {
    const decision = await this.access.decide(subject, action, paths);
    if (decision.allowed.length === 0) throw new ForbiddenException();
    return decision;
  }

  private pathLimits() {
    return {
      maxPaths: this.config.get('max-paths-per-stream'),
      maxPathLength: this.config.get('max-path-length'),
    };
  }
}
