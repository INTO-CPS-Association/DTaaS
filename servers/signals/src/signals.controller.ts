import {
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
import {
  parseRangeRequest,
  parseStreamRequest,
  twinOf,
  type TwinRef,
} from './dto/requests.js';
import DeliveryStats, { type DeliveryCounts } from './stream/delivery-stats.js';
import StreamService from './stream/stream.service.js';
import StreamSlots from './stream/stream-slots.js';

export type PlaceholderAnswer = {
  status: 'not-implemented';
  route: 'range';
};

function subjectOf(request: AuthenticatedRequest): Subject {
  const user = userOf(request);
  const { id, username, owners } = user.identity;
  return { id, username, token: user.token, owners };
}

// Stream serves live samples as server-sent events. Range signs the user in
// and decides access, then answers 501 until the history phase fills it in.
@Controller('signals')
export default class SignalsController {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly access: AccessService,
    private readonly streams: StreamService,
    private readonly slots: StreamSlots,
    private readonly stats: DeliveryStats,
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
      const twin = twinOf(body);
      const decision = await this.authorise(subject, 'stream', paths, twin);
      const allowed = decision.allowed.map((target) => target.path);
      const recheck = async () =>
        (await this.access.decide(subject, 'stream', allowed, twin)).refused;
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
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @UseGuards(SignalsAuthGuard)
  async range(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<PlaceholderAnswer> {
    const limits = {
      ...this.pathLimits(),
      maxSpan: this.config.get('range-max-span'),
    };
    const { paths } = parseRangeRequest(body, limits);
    await this.authorise(subjectOf(request), 'range', paths, twinOf(body));
    return { status: 'not-implemented', route: 'range' };
  }

  // Nothing the user may read is refused before any work is done.
  private async authorise(
    subject: Subject,
    action: Action,
    paths: string[],
    twin?: TwinRef,
  ): Promise<PathDecision> {
    const decision = await this.access.decide(subject, action, paths, twin);
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
