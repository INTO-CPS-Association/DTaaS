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
import type { Action, SignalTarget, Subject } from './authz/policy.js';
import Config from './config/config.service.js';
import CommandService, {
  type CommandAnswer,
} from './command/command.service.js';
import {
  parseCommandRequest,
  parseRangeRequest,
  parseStreamRequest,
  twinOf,
  type TwinRef,
} from './dto/requests.js';
import HistoryService, {
  type HistoryAnswer,
} from './history/history.service.js';
import type { Backfill, PastSample } from './stream/stream-session.js';
import DeliveryStats, { type DeliveryCounts } from './stream/delivery-stats.js';
import StreamService from './stream/stream.service.js';
import StreamSlots from './stream/stream-slots.js';
import { getClientTracker } from './socket-address-throttler.guard.js';

// The id the gateway gave the last sample a client received: a time in
// milliseconds. Anything else is ignored and the stream starts live.
function lastEventIdOf(request: AuthenticatedRequest): number | undefined {
  const header = request.headers['last-event-id'];
  if (typeof header !== 'string' || !/^\d{1,15}$/.test(header))
    return undefined;
  return Number(header);
}

function subjectOf(request: AuthenticatedRequest): Subject {
  const user = userOf(request);
  const { id, username, owners, writers } = user.identity;
  return { id, username, token: user.token, owners, writers };
}

// Stream serves live samples as server-sent events, range serves past
// samples as JSON and command sends a set point to a twin, each behind the
// sign-in and the access decision.
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
    private readonly commands: CommandService,
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
      const lastId = lastEventIdOf(request);
      const backfill =
        lastId === undefined
          ? undefined
          : () => this.gapOf(decision.allowed, lastId);
      await this.streams.run(response, identity, decision, recheck, backfill);
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
    const decision = await this.authorise(
      subjectOf(request),
      'range',
      paths,
      twinOf(body),
    );
    try {
      return await this.history.range(decision.allowed, span);
    } catch {
      // The database's own message may name a host or a role, so the client
      // gets no detail.
      throw new BadGatewayException();
    }
  }

  /** Sends a set point to the device of an actuator topic a twin declares. */
  @Post('command')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(SignalsAuthGuard)
  async command(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<CommandAnswer> {
    const command = parseCommandRequest(
      body,
      this.config.get('max-path-length'),
    );
    const topic = this.commands.topicOf(command);
    const subject = subjectOf(request);
    const decision = await this.authorise(subject, 'command', [command.path]);
    // A twin opens a path to commands by declaring it on the setpoint
    // channel. A path it declares only to be read takes none.
    if (decision.allowed[0].channel !== 'setpoint')
      throw new ForbiddenException();
    return this.commands.send(
      subject,
      topic,
      command,
      getClientTracker({ ip: request.ip, socket: request.socket }),
    );
  }

  // The readings of the allowed signals since the last sample the client
  // received, less the lookback, at most resume-max-gap back.
  private async gapOf(
    targets: readonly SignalTarget[],
    lastId: number,
  ): ReturnType<Backfill> {
    const to = Date.now();
    const wanted = lastId - this.config.get('resume-lookback');
    const from = Math.max(wanted, to - this.config.get('resume-max-gap'));
    const byPath = new Map(targets.map((target) => [target.path, target]));
    const channels = [...new Set(targets.map((target) => target.channel))];
    const answers = await Promise.all(
      channels.map((channel) =>
        this.history.range(targets, { channel, from, to }),
      ),
    );
    const samples: PastSample[] = answers
      .flatMap((answer) => answer.samples)
      .flatMap((sample) => {
        const target = byPath.get(sample.path);
        if (target === undefined) return [];
        const { path, channel, ts, value } = sample;
        return [{ path, twin: target.twin, channel, ts, value }];
      })
      .sort((a, b) => a.ts - b.ts);
    const complete =
      from === wanted && answers.every((answer) => !answer.truncated);
    return { samples, complete, from, to };
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
