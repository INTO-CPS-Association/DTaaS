import type { InfluxSource } from '../authz/policy.js';

export type FluxQuery = {
  query: string;
  params: Record<string, string | number>;
};

export type RangeWindow = {
  topic: string;
  from: number;
  to: number;
  limit: number;
  /** Downsample to one point per window of this many milliseconds. */
  everyMs?: number;
};

// Telegraf's MQTT consumer, which the DTaaS examples use to fill InfluxDB,
// tags each point with its topic and writes the reading to the field
// 'value'. The query text is fixed: every value from the request travels
// in params, so nothing a user sends becomes Flux code.
const SOURCE = `from(bucket: params.bucket)
  |> range(start: time(v: params.start), stop: time(v: params.stop))
  |> filter(fn: (r) => r.topic == params.topic and r._field == "value")`;
const BY_MEASUREMENT = `
  |> filter(fn: (r) => r._measurement == params.measurement)`;
const DOWNSAMPLE = `
  |> aggregateWindow(every: duration(v: params.every), fn: last, createEmpty: false)`;
const ORDER_AND_LIMIT = `
  |> group()
  |> sort(columns: ["_time"])
  |> limit(n: int(v: params.limit))`;

export function buildRangeQuery(
  source: InfluxSource,
  window: RangeWindow,
): FluxQuery {
  const params: FluxQuery['params'] = {
    bucket: source.bucket,
    start: new Date(window.from).toISOString(),
    stop: new Date(window.to).toISOString(),
    topic: window.topic,
    limit: window.limit,
  };
  let query = SOURCE;
  if (source.measurement !== undefined) {
    query += BY_MEASUREMENT;
    params.measurement = source.measurement;
  }
  if (window.everyMs !== undefined) {
    query += DOWNSAMPLE;
    params.every = `${Math.max(1, Math.ceil(window.everyMs))}ms`;
  }
  return { query: query + ORDER_AND_LIMIT, params };
}
