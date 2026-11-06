import { Injectable } from '@nestjs/common';
import type { Channel, SignalTarget } from '../authz/policy.js';
import Config from '../config/config.service.js';
import PostgresClient, { type Row } from './postgres.client.js';
import readingKeyOf, { type ReadingKey } from './reading-key.js';

export type HistorySample = {
  path: string;
  channel: Channel;
  ts: number;
  value: number;
  /** The reading table keeps no quality. Kept for the client contract. */
  quality: null;
};

export type HistoryAnswer = { samples: HistorySample[]; truncated: boolean };

type Span = { channel: Channel; from: number; to: number };

const RAW_QUERY = `select time, value from reading
  where device_id = $1 and quantity = $2 and time >= $3 and time < $4
    and value is not null
  order by time limit $5`;

// date_bin puts each reading in a bin of the given width, counted from the
// start of the range. The answer has one averaged point per bin.
const BINNED_QUERY = `select date_bin($5::interval, time, $3) as time,
    avg(value) as value from reading
  where device_id = $1 and quantity = $2 and time >= $3 and time < $4
    and value is not null
  group by 1 order by 1 limit $6`;

function fillGroup(template: string, group: string): string {
  return template.replaceAll('{group}', group);
}

/** Past samples of signals the caller already authorised, from PostgreSQL. */
@Injectable()
export default class HistoryService {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly postgres: PostgresClient,
  ) {} // eslint-disable-line no-empty-function

  async range(
    targets: readonly SignalTarget[],
    span: Span,
  ): Promise<HistoryAnswer> {
    // A signal answers only for the channel its twin declares, only from the
    // database of the owner's group and only for a topic of the convention.
    const served = targets.filter(
      (target) =>
        target.channel === span.channel &&
        target.group !== undefined &&
        readingKeyOf(target.path) !== undefined,
    );
    const maxPoints = this.config.get('range-max-points');
    // Every signal gets at least one point, so past maxPoints signals the
    // rest are left out and the answer says it was cut.
    const kept = served.slice(0, maxPoints);
    const budget = Math.floor(maxPoints / Math.max(1, kept.length));
    const parts = await Promise.all(
      kept.map((target) => this.rangeOf(target, span, budget)),
    );
    return {
      samples: parts.flatMap((part) => part.samples),
      truncated: kept.length < served.length || parts.some((p) => p.truncated),
    };
  }

  // Ask for one point more than the budget. When it comes back, the range
  // holds too many points, and it is asked again in bins.
  private async rangeOf(
    target: SignalTarget,
    span: Span,
    budget: number,
  ): Promise<HistoryAnswer> {
    const key = readingKeyOf(target.path) as ReadingKey;
    const database = fillGroup(
      this.config.get('postgres-database-template'),
      target.group as string,
    );
    const window = [
      key.deviceId,
      key.quantity,
      new Date(span.from),
      new Date(span.to),
    ];
    const raw = await this.postgres.query(database, RAW_QUERY, [
      ...window,
      budget + 1,
    ]);
    if (raw.length <= budget)
      return { samples: this.samplesOf(raw, target, span), truncated: false };
    const binMs = Math.ceil((span.to - span.from) / budget);
    const binned = await this.postgres.query(database, BINNED_QUERY, [
      ...window,
      `${binMs} milliseconds`,
      budget,
    ]);
    return { samples: this.samplesOf(binned, target, span), truncated: true };
  }

  private samplesOf(
    rows: Row[],
    target: SignalTarget,
    span: Span,
  ): HistorySample[] {
    return rows.flatMap((row) => {
      const ts = row.time instanceof Date ? row.time.getTime() : Number.NaN;
      // Number(null) is 0, so a missing value is checked before converting.
      const value = row.value === null ? Number.NaN : Number(row.value);
      if (!Number.isFinite(ts) || !Number.isFinite(value)) return [];
      return [
        { path: target.path, channel: span.channel, ts, value, quality: null },
      ];
    });
  }
}
