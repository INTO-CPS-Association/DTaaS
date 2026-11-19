import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type pg from 'pg';
import PostgresClient from 'src/history/postgres.client';
import testConfig from 'test/helpers/config';

describe('PostgresClient', () => {
  let dir = '';
  let passwordFile = '';
  const opened: pg.PoolConfig[] = [];
  const ended: string[] = [];
  const handlers: Array<{ event: string; handler: (e: Error) => void }> = [];

  function clientWith(tls = false) {
    const client = new PostgresClient(
      testConfig({
        'postgres-url': 'postgres://db.example:6543',
        'postgres-password-file': passwordFile,
        'postgres-tls': tls,
      }),
    );
    client.usePools((config) => {
      opened.push(config);
      return {
        query: async () => ({ rows: [{ database: config.database }] }),
        on: (event: string, handler: (error: Error) => void) => {
          handlers.push({ event, handler });
        },
        end: async () => {
          ended.push(String(config.database));
        },
      } as unknown as pg.Pool;
    });
    return client;
  }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'signals-pg-'));
    passwordFile = path.join(dir, 'postgresql_dtaas_signals_ro_password');
    await writeFile(passwordFile, 'db-secret\n', { mode: 0o600 });
    opened.length = 0;
    ended.length = 0;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('opens one pool per group database as the read-only account', async () => {
    const client = clientWith();
    await client.query('swim', 'select 1', []);
    await client.query('swim', 'select 1', []);
    const rows = await client.query('other', 'select 1', []);
    expect(rows).toEqual([{ database: 'other' }]);
    expect(opened.map((config) => config.database)).toEqual(['swim', 'other']);
    expect(opened[0]).toMatchObject({
      host: 'db.example',
      port: 6543,
      user: 'dtaas_signals_ro',
      ssl: false,
    });
  });

  it('reads the password from its file and verifies the server certificate with TLS', async () => {
    const client = clientWith(true);
    await client.query('swim', 'select 1', []);
    const password = opened[0].password as () => Promise<string>;
    await expect(password()).resolves.toBe('db-secret');
    expect(opened[0].ssl).toEqual({ rejectUnauthorized: true });
  });

  it('logs an error of an idle connection instead of ending the process', async () => {
    const client = clientWith();
    await client.query('swim', 'select 1', []);
    const onError = handlers.find((h) => h.event === 'error');
    expect(onError).toBeDefined();
    expect(() =>
      onError?.handler(new Error('terminating connection')),
    ).not.toThrow();
  });

  it('ends every pool when the module stops', async () => {
    const client = clientWith();
    await client.query('a', 'select 1', []);
    await client.query('b', 'select 1', []);
    await client.onModuleDestroy();
    expect(ended).toEqual(['a', 'b']);
  });
});
