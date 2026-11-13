import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { SignalTarget } from 'src/authz/policy';
import HistoryService from 'src/history/history.service';
import PostgresClient from 'src/history/postgres.client';
import testConfig from 'test/helpers/config';

// The PostgreSQL release of the platform services, pinned by digest.
const IMAGE =
  'postgres:18.6-alpine@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873';
const DEVICE = 'S-SWiM-CTO-room-0224-seat48A-TRH-0001';
const TOPIC = `SWiM/CTO/room/0224/seat48A/S/${DEVICE}/temperature`;
const dockerAvailable =
  spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
const describeWithDocker = dockerAvailable ? describe : describe.skip;

function docker(args: string[], input?: string): string {
  return execFileSync('docker', args, { input, encoding: 'utf8' }).trim();
}

function psql(container: string, sql: string, database = 'swim'): string {
  return docker(
    [
      'exec',
      '-i',
      container,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      database,
    ],
    sql,
  );
}

async function waitUntilReady(container: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = spawnSync('docker', [
      'exec',
      container,
      'pg_isready',
      '-U',
      'postgres',
    ]);
    if (ready.status === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('PostgreSQL did not start');
}

// The tables of the naming convention and the read-only account of the
// gateway, with 120 readings one second apart.
function createGroupDatabase(container: string, password: string): void {
  psql(container, 'create database swim;', 'postgres');
  psql(
    container,
    `
    create table device (device_id text primary key);
    create table reading (
      time timestamptz not null, device_id text not null,
      quantity text not null, value double precision, unit text not null,
      constraint reading_device_id_fkey foreign key (device_id) references device (device_id));
    create index reading_device_id_time_idx on reading (device_id, time desc);
    insert into device values ('${DEVICE}');
    insert into reading select to_timestamp(s), '${DEVICE}', 'temperature', s, 'Cel'
      from generate_series(0, 119) s;
    create role dtaas_signals_ro login password '${password}';
    grant select on reading to dtaas_signals_ro;`,
  );
}

describeWithDocker('HistoryService against PostgreSQL', () => {
  const container = `signals-pg-int-${randomBytes(4).toString('hex')}`;
  const password = randomBytes(16).toString('hex');
  const target: SignalTarget = {
    path: TOPIC,
    owner: 'swim',
    twin: 'room',
    channel: 'measured',
    group: 'swim',
  };
  let dir = '';
  let postgres: PostgresClient;

  function historyWith(maxPoints: number) {
    const config = testConfig({
      'postgres-url': `postgres://${docker(['port', container, '5432/tcp']).split('\n')[0]}`,
      'postgres-password-file': path.join(dir, 'password'),
      'range-max-points': maxPoints,
    });
    postgres = new PostgresClient(config);
    return new HistoryService(config, postgres);
  }

  beforeAll(async () => {
    docker([
      'run',
      '-d',
      '--rm',
      '--name',
      container,
      '-p',
      '127.0.0.1::5432',
      '-e',
      `POSTGRES_PASSWORD=${randomBytes(16).toString('hex')}`,
      IMAGE,
    ]);
    await waitUntilReady(container);
    createGroupDatabase(container, password);
    dir = await mkdtemp(path.join(os.tmpdir(), 'signals-pg-int-'));
    await writeFile(path.join(dir, 'password'), password, { mode: 0o600 });
  }, 120_000);

  afterAll(async () => {
    await postgres?.onModuleDestroy();
    spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
    if (dir !== '') await rm(dir, { recursive: true, force: true });
  });

  it('answers every reading of a range within the budget', async () => {
    const span = { channel: 'measured' as const, from: 10_000, to: 20_000 };
    const answer = await historyWith(100).range([target], span);
    expect(answer.truncated).toBe(false);
    expect(answer.samples.map((s) => s.value)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
    await postgres.onModuleDestroy();
  });

  it('averages a longer range in date_bin bins', async () => {
    const span = { channel: 'measured' as const, from: 0, to: 120_000 };
    const answer = await historyWith(12).range([target], span);
    expect(answer.truncated).toBe(true);
    expect(answer.samples).toHaveLength(12);
    expect(answer.samples[0]).toMatchObject({ ts: 0, value: 4.5 });
    expect(answer.samples[11]).toMatchObject({ ts: 110_000, value: 114.5 });
    await postgres.onModuleDestroy();
  });

  it('cannot write with the read-only account', async () => {
    historyWith(10);
    await expect(
      postgres.query(
        'swim',
        'insert into reading values (now(), $1, $2, 1, $3)',
        [DEVICE, 'x', 'Cel'],
      ),
    ).rejects.toThrow('permission denied');
    await postgres.onModuleDestroy();
  });
});
