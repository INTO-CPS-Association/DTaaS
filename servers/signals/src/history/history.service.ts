import { Injectable, Logger } from '@nestjs/common';
import type { Channel, InfluxSource, SignalTarget } from '../authz/policy.js';
import Config from '../config/config.service.js';
import { readInfluxTokens } from '../config/secrets.js';
import type { CsvRow } from './annotated-csv.js';
import { buildRangeQuery } from './flux.js';
import InfluxClient from './influx.client.js';

export type HistorySample = {
  path: string;
  channel: Channel;
  ts: number;
  value: string | number | boolean;
  quality: 'good' | 'stale' | 'bad' | null;
};

export type HistoryAnswer = { samples: HistorySample[]; truncated: boolean };

type Span = { channel: Channel; from: number; to: number };

const QUALITIES = new Set(['good', 'stale', 'bad']);

function sampleOf(
  row: CsvRow,
  path: string,
  channel: Channel,
): HistorySample[] {
  const ts = typeof row._time === 'string' ? Date.parse(row._time) : Number.NaN;
  const value = row._value;
  if (!Number.isFinite(ts) || value === null || value === undefined) return [];
  const quality = QUALITIES.has(String(row.quality))
    ? (row.quality as HistorySample['quality'])
    : null;
  return [{ path, channel, ts, value, quality }];
}

/** Past samples of signals the caller already authorised, from InfluxDB. */
@Injectable()
export default class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  // eslint-disable-next-line no-useless-constructor
  constructor(
    private readonly config: Config,
    private readonly influx: InfluxClient,
  ) {} // eslint-disable-line no-empty-function

  async range(
    targets: readonly SignalTarget[],
    span: Span,
  ): Promise<HistoryAnswer> {
    const withHistory = targets.filter((target) => target.influx !== undefined);
    if (withHistory.length === 0) return { samples: [], truncated: false };
    const tokens = await readInfluxTokens(
      this.config.get('influx-tokens-file'),
    );
    const budget = Math.max(
      1,
      Math.floor(this.config.get('range-max-points') / withHistory.length),
    );
    const answer: HistoryAnswer = { samples: [], truncated: false };
    for (const target of withHistory) {
      const part = await this.rangeOf(
        target,
        target.influx as InfluxSource,
        tokens,
        span,
        budget,
      );
      answer.samples.push(...part.samples);
      answer.truncated ||= part.truncated;
    }
    return answer;
  }

  // Ask for one point more than the budget. When it comes back, the range
  // holds too many points, and it is asked again downsampled to the budget.
  private async rangeOf(
    target: SignalTarget,
    source: InfluxSource,
    tokens: Record<string, string>,
    span: Span,
    budget: number,
  ): Promise<HistoryAnswer> {
    const token = tokens[source.org];
    if (token === undefined) {
      this.logger.warn(`No InfluxDB token for the org of ${target.owner}`);
      return { samples: [], truncated: false };
    }
    const window = { topic: target.path, from: span.from, to: span.to };
    const rows = await this.influx.query(
      source.org,
      token,
      buildRangeQuery(source, { ...window, limit: budget + 1 }),
    );
    if (rows.length <= budget)
      return { samples: this.samplesOf(rows, target, span), truncated: false };
    const everyMs = (span.to - span.from) / budget;
    const downsampled = await this.influx.query(
      source.org,
      token,
      buildRangeQuery(source, { ...window, limit: budget, everyMs }),
    );
    return {
      samples: this.samplesOf(downsampled, target, span),
      truncated: true,
    };
  }

  private samplesOf(
    rows: CsvRow[],
    target: SignalTarget,
    span: Span,
  ): HistorySample[] {
    return rows.flatMap((row) => sampleOf(row, target.path, span.channel));
  }
}
