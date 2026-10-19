import { Injectable } from '@nestjs/common';
import Config from '../config/config.service.js';
import { type CsvRow, parseAnnotatedCsv } from './annotated-csv.js';
import type { FluxQuery } from './flux.js';

const DIALECT = {
  header: true,
  delimiter: ',',
  annotations: ['datatype', 'group', 'default'],
};

/** Flux queries to InfluxDB 2 over its HTTP API, with a read-only token. */
@Injectable()
export default class InfluxClient {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly config: Config) {}

  async query(org: string, token: string, flux: FluxQuery): Promise<CsvRow[]> {
    const url = new URL('api/v2/query', this.baseUrl());
    url.searchParams.set('org', org);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/csv',
      },
      body: JSON.stringify({ ...flux, type: 'flux', dialect: DIALECT }),
      redirect: 'error',
      signal: AbortSignal.timeout(this.config.get('influx-timeout')),
    });
    if (!response.ok) throw new Error(`InfluxDB answered ${response.status}`);
    return parseAnnotatedCsv(await response.text());
  }

  private baseUrl(): string {
    const base = this.config.get('influx-url');
    return base.endsWith('/') ? base : `${base}/`;
  }
}
