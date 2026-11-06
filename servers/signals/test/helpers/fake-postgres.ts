import type PostgresClient from 'src/history/postgres.client';
import type { Row } from 'src/history/postgres.client';

export type Query = { database: string; text: string; values: unknown[] };

/** Answers queries from a function, and records each one. */
export default class FakePostgres {
  readonly queries: Query[] = [];

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly answer: (query: Query) => Row[] | Error) {}

  async query(database: string, text: string, values: unknown[]) {
    const query = { database, text, values };
    this.queries.push(query);
    const rows = this.answer(query);
    if (rows instanceof Error) throw rows;
    return rows;
  }

  asClient(): PostgresClient {
    return this as unknown as PostgresClient;
  }
}

/** One row per millisecond from the start, as the reading table answers. */
export function rowsFrom(start: number, count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(start + i),
    value: i,
  }));
}
