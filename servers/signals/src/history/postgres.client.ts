import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import Config from '../config/config.service.js';
import readSecretFile from '../config/secrets.js';

export type Row = Record<string, unknown>;

/** Opens a pool for one database. A test passes its own. */
export type PoolFactory = (config: pg.PoolConfig) => pg.Pool;

const MAX_CONNECTIONS_PER_DATABASE = 4;

/**
 * Read-only queries on the database of each group, as dtaas_signals_ro.
 * Every value is a query parameter. One small pool per group database, so
 * the history of one group never travels on a connection to another's.
 */
@Injectable()
export default class PostgresClient implements OnModuleDestroy {
  private readonly logger = new Logger(PostgresClient.name);
  private readonly pools = new Map<string, pg.Pool>();
  private poolOf: PoolFactory = (config) => new pg.Pool(config);

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly config: Config) {}

  usePools(factory: PoolFactory): void {
    this.poolOf = factory;
  }

  async query(
    database: string,
    text: string,
    values: unknown[],
  ): Promise<Row[]> {
    const pool = this.pools.get(database) ?? this.open(database);
    const result = await pool.query({ text, values });
    return result.rows as Row[];
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.pools.values()].map((pool) => pool.end()));
    this.pools.clear();
  }

  private open(database: string): pg.Pool {
    const url = new URL(this.config.get('postgres-url'));
    const timeout = this.config.get('postgres-timeout');
    const pool = this.poolOf({
      host: url.hostname,
      port: url.port === '' ? 5432 : Number(url.port),
      database,
      user: this.config.get('postgres-user'),
      // Read on every new connection, so a rotated password takes effect.
      password: () =>
        readSecretFile(
          this.config.get('postgres-password-file'),
          'postgres-password-file',
        ),
      ssl: this.config.get('postgres-tls')
        ? { rejectUnauthorized: true }
        : false,
      max: MAX_CONNECTIONS_PER_DATABASE,
      connectionTimeoutMillis: timeout,
      statement_timeout: timeout,
    });
    // An idle connection that the server drops emits 'error' on the pool.
    // Without a listener that would end the process. The next query opens
    // a new connection.
    pool.on('error', (error) =>
      this.logger.warn(`PostgreSQL connection error: ${error.message}`),
    );
    this.pools.set(database, pool);
    return pool;
  }
}
