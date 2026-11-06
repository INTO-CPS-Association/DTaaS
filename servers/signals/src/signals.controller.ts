import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import SignalsAuthGuard, {
  type AuthenticatedRequest,
  userOf,
} from './auth/auth.guard.js';
import AccessService from './authz/access.service.js';
import type { Action, Subject } from './authz/policy.js';
import Config from './config/config.service.js';
import { parseRangeRequest, parseStreamRequest } from './dto/requests.js';

export type PlaceholderAnswer = {
  status: 'not-implemented';
  route: Action;
};

function subjectOf(request: AuthenticatedRequest): Subject {
  const user = userOf(request);
  const { id, username, owners } = user.identity;
  return { id, username, token: user.token, owners };
}

// Stream and range sign the user in and decide access before they answer
// 501. The live samples and the history fill them in later phases, behind
// the same checks.
@Controller('signals')
export default class SignalsController {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly access: AccessService,
  ) {} // eslint-disable-line no-empty-function

  @Get('health')
  @SkipThrottle()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Post('stream')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @UseGuards(SignalsAuthGuard)
  async stream(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<PlaceholderAnswer> {
    const paths = parseStreamRequest(body, this.pathLimits());
    await this.authorise(request, 'stream', paths);
    return { status: 'not-implemented', route: 'stream' };
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
    await this.authorise(request, 'range', paths);
    return { status: 'not-implemented', route: 'range' };
  }

  // Nothing the user may read is refused before any work is done.
  private async authorise(
    request: AuthenticatedRequest,
    action: Action,
    paths: string[],
  ): Promise<void> {
    const decision = await this.access.decide(
      subjectOf(request),
      action,
      paths,
    );
    if (decision.allowed.length === 0) throw new ForbiddenException();
  }

  private pathLimits() {
    return {
      maxPaths: this.config.get('max-paths-per-stream'),
      maxPathLength: this.config.get('max-path-length'),
    };
  }
}
