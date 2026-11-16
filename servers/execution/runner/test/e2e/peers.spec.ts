import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { startStoredRunner } from './util';

const BASE =
  'id: hospital-1\nport: 5000\nlocation: .\ncommands: [create]\n' +
  'database: runner.db\n';

const PEERS =
  'peers:\n' +
  '  - id: hospital-2\n' +
  '    topic: dtaas/hospital-2\n' +
  "    url: 'http://localhost:5200'\n" +
  '    attributes: {distance: 12.4}\n' +
  '  - {id: hospital-3, url: "http://localhost:5300", enabled: false}\n';

const unknown = { online: null, descriptor: null, state: null };

const peers = (enabled2: boolean, enabled3: boolean) => ({
  'hospital-2': {
    topic: 'dtaas/hospital-2',
    url: 'http://localhost:5200',
    attributes: { distance: 12.4 },
    enabled: enabled2,
    ...unknown,
  },
  'hospital-3': {
    topic: null,
    url: 'http://localhost:5300',
    attributes: {},
    enabled: enabled3,
    ...unknown,
  },
});

describe('Runner peers end-to-end tests', () => {
  let dir: string;
  let app: INestApplication | undefined;

  const http = () => supertest((app as INestApplication).getHttpServer());

  async function start(config: string): Promise<void> {
    writeFileSync(join(dir, 'runner.yaml'), config);
    app = await startStoredRunner(join(dir, 'runner.yaml'));
  }

  const put = (body: unknown) =>
    http()
      .put('/peers')
      .send(body as object);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-peers-'));
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    rmSync(dir, { recursive: true, force: true });
  });

  it('Should list no peers without a peers section', async () => {
    await start(BASE);

    const { status, body } = await http().get('/peers');

    expect([status, body]).toEqual([HttpStatus.OK, {}]);
  });

  it('Should list the peers of runner.yaml', async () => {
    await start(BASE + PEERS);

    const { status, body } = await http().get('/peers');

    expect([status, body]).toEqual([HttpStatus.OK, peers(true, false)]);
  });

  it('Should refuse a body with every problem and apply none', async () => {
    await start(BASE + PEERS);

    const { status, body } = await put({
      'hospital-9': false,
      'hospital-2': 'off',
      'hospital-3': true,
    });

    expect([status, body]).toEqual([
      HttpStatus.BAD_REQUEST,
      {
        message: ['unknown peer hospital-9', 'peer hospital-2 takes a boolean'],
        error: 'Bad Request',
        statusCode: 400,
      },
    ]);
    expect((await http().get('/peers')).body).toEqual(peers(true, false));
  });

  it('Should refuse a body that is not an object', async () => {
    await start(BASE + PEERS);

    const { status, body } = await put([]);

    expect([status, body.message]).toEqual([
      HttpStatus.BAD_REQUEST,
      'Validation Failed',
    ]);
  });

  it('Should take an empty body', async () => {
    await start(BASE + PEERS);

    const { status, body } = await put({});

    expect([status, body]).toEqual([HttpStatus.OK, peers(true, false)]);
  });

  it('Should switch peers and keep the switches across a restart', async () => {
    await start(BASE + PEERS);

    const { status, body } = await put({
      'hospital-2': false,
      'hospital-3': true,
    });
    expect([status, body]).toEqual([HttpStatus.OK, peers(false, true)]);
    expect((await http().get('/dt')).body.peers).toEqual(['hospital-3']);

    await app?.close();
    await start(BASE + PEERS);

    expect((await http().get('/peers')).body).toEqual(peers(false, true));
    expect((await http().get('/dt')).body.peers).toEqual(['hospital-3']);
  });
});
