import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import supertest from 'supertest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import AppModule from 'src/app.module';

const VALID_PAYLOAD_FIXTURES = [
  'sample.json',
  'valid-1.json',
  'valid-2.json',
  'valid-3.json',
  'valid-4.json',
  'valid-5.json',
] as const;

const INVALID_PAYLOAD_FIXTURES = [
  'invalid-1.json',
  'invalid-2.json',
  'invalid-3.json',
  'invalid-4.json',
  'invalid-5.json',
] as const;

async function readPayloadFixture(
  fileName: (typeof VALID_PAYLOAD_FIXTURES)[number] | (typeof INVALID_PAYLOAD_FIXTURES)[number],
): Promise<Record<string, unknown>> {
  const fixturePath = path.resolve(process.cwd(), 'api', fileName);
  const payload = await readFile(fixturePath, 'utf8');
  return JSON.parse(payload) as Record<string, unknown>;
}

describe('Logger service e2e', () => {
  let app: INestApplication;
  let logFilePath = '';
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-e2e-'));
    logFilePath = path.join(tempDir, 'events.jsonl');
    process.env.LOGGER_CONFIG_PATH = '';
    process.env.LOGGER_TLS = 'false';
    process.env.LOGGER_CERTS_DIR = '';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = '*';
    process.env.LOGGER_LOG_FILE_PATH = logFilePath;
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '65536';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('GET /logger/health returns ok', async () => {
    await supertest(app.getHttpServer())
      .get('/logger/health')
      .expect(HttpStatus.OK)
      .expect({ status: 'ok' });
  });

  it('POST /logger persists valid payload fixtures from api/', async () => {
    const sentPayloads: Array<Record<string, unknown>> = [];
    for (const fileName of VALID_PAYLOAD_FIXTURES) {
      const payload = await readPayloadFixture(fileName);
      sentPayloads.push(payload);
      await supertest(app.getHttpServer())
        .post('/logger')
        .send(payload)
        .set('Content-Type', 'application/json')
        .expect(HttpStatus.NO_CONTENT);
    }

    const content = await readFile(logFilePath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(VALID_PAYLOAD_FIXTURES.length);
    for (let index = 0; index < lines.length; index += 1) {
      expect(JSON.parse(lines[index])).toEqual(sentPayloads[index]);
    }
  });

  it('POST /logger rejects invalid payload fixtures from api/', async () => {
    for (const fileName of INVALID_PAYLOAD_FIXTURES) {
      const payload = await readPayloadFixture(fileName);
      await supertest(app.getHttpServer())
        .post('/logger')
        .send(payload)
        .set('Content-Type', 'application/json')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          message: 'Validation Failed',
          error: 'Bad Request',
          statusCode: 400,
        });
    }
  });

  it('OPTIONS /logger exposes CORS headers', async () => {
    await supertest(app.getHttpServer())
      .options('/logger')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .expect(HttpStatus.NO_CONTENT)
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
      .expect('Access-Control-Allow-Credentials', 'true');
  });
});
