import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { startRunner } from './util';

const BASE = 'port: 5000\nlocation: .\ncommands: [create, execute]\n';

// Writes the configuration into the folder and starts the runner on it
async function startRunnerWith(dir: string, config: string) {
  writeFileSync(join(dir, 'runner.yaml'), config);
  return startRunner(join(dir, 'runner.yaml'));
}

describe('Runner descriptor end-to-end tests', () => {
  let dir: string;
  let app: INestApplication;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-dt-'));
  });

  afterEach(async () => {
    await app?.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('Should describe a runner without attributes or a state machine', async () => {
    app = await startRunnerWith(dir, `id: dt-1\n${BASE}`);

    const { status, body } = await supertest(app.getHttpServer()).get('/dt');

    expect([status, body]).toEqual([
      HttpStatus.OK,
      {
        id: 'dt-1',
        attributes: {},
        commands: ['create', 'execute'],
        stateMachine: false,
        manager: { commands: [] },
        peers: [],
        publicKey: null,
      },
    ]);
  });

  it('Should describe a runner with attributes, a state machine and peers', async () => {
    writeFileSync(
      join(dir, 'dt.yaml'),
      'states:\n  create:\nmanager:\n  commands:\n    - execute\n',
    );
    app = await startRunnerWith(
      dir,
      `id: hospital-1\n${BASE}stateMachine: dt.yaml\n` +
        'attributes: {city: Aarhus, beds: 120, open: true}\n' +
        'peers:\n  - {id: hospital-2, topic: dtaas/hospital-2}\n' +
        '  - {id: hospital-3, url: "http://h3", enabled: false}\n',
    );

    const { status, body } = await supertest(app.getHttpServer()).get('/dt');

    expect([status, body]).toEqual([
      HttpStatus.OK,
      {
        id: 'hospital-1',
        attributes: { city: 'Aarhus', beds: 120, open: true },
        commands: ['create', 'execute'],
        stateMachine: true,
        manager: { commands: ['execute'] },
        peers: ['hospital-2'],
        publicKey: null,
      },
    ]);
  });

  it('Should give the public key of auth.key', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    writeFileSync(join(dir, 'dt.key'), pem);
    app = await startRunnerWith(
      dir,
      `id: dt-1
${BASE}auth:
  key: dt.key
`,
    );

    const { body } = await supertest(app.getHttpServer()).get('/dt');

    expect(body.publicKey).toBe(publicKey.export({ format: 'jwk' }).x);
  });
});
