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
  type AuthenticatedUser,
  userOf,
} from './auth/auth.guard.js';
import AccessService from './authz/access.service.js';
import type { Subject } from './authz/policy.js';
import Config from './config/config.service.js';
import { parseRangeRequest, parseStreamRequest } from './dto/requests.js';
import HistoryService, {
  type HistoryAnswer,
} from './history/history.service.js';
import StreamService from './stream/stream.service.js';
import StreamSlots from './stream/stream-slots.js';

function subjectOf(user: AuthenticatedUser): Subject {
  const { id, username } = user.identity;
  return { id, username, token: user.token };
}

@Controller('signals')
export default class SignalsController {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly access: AccessService,
    private readonly streams: StreamService,
    private readonly slots: StreamSlots,
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
    const user = userOf(request);
    const release = this.slots.acquire(user.identity.id);
    try {
      const decision = await this.access.decide(
        subjectOf(user),
        'stream',
        paths,
      );
      // Nothing the user may read: refuse before any binding is made.
      if (decision.allowed.length === 0) throw new ForbiddenException();
      await this.streams.run(response, user.identity, decision);
    } finally {
      release();
    }
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
    const decision = await this.access.decide(
      subjectOf(userOf(request)),
      'range',
      paths,
    );
    if (decision.allowed.length === 0) throw new ForbiddenException();
    try {
      return await this.history.range(decision.allowed, span);
    } catch {
      throw new BadGatewayException();
    }
  }

  private pathLimits() {
    return {
      maxPaths: this.config.get('max-paths-per-stream'),
      maxPathLength: this.config.get('max-path-length'),
    };
  }
}
