import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { INestApplication, HttpStatus } from '@nestjs/common';
import supertest from 'supertest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Config from 'src/config/config.service';
import { createLoggerApp } from 'src/main';

const VALID_PAYLOAD_FIXTURES = [
  'sample.json',
  'valid-1.json',
  'valid-2.json',
  'valid-3.json',
  'valid-4.json',
  'valid-5.json',
  'valid-6.json',
] as const;

const INVALID_PAYLOAD_FIXTURES = [
  'invalid-1.json',
  'invalid-2.json',
  'invalid-3.json',
  'invalid-4.json',
  'invalid-5.json',
] as const;

async function readPayloadFixture(
  fileName:
    | (typeof VALID_PAYLOAD_FIXTURES)[number]
    | (typeof INVALID_PAYLOAD_FIXTURES)[number],
): Promise<Record<string, unknown>> {
  const fixturePath = path.resolve(process.cwd(), 'api', fileName);
  const payload = await readFile(fixturePath, 'utf8');
  return JSON.parse(payload) as Record<string, unknown>;
}

async function createTestApp(): Promise<INestApplication> {
  const app = await createLoggerApp(new Config(), { logger: false });
  await app.init();
  return app;
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
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_AUTH_TOKEN;

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    delete process.env.LOGGER_AUTH_TOKEN;
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
      const response = await supertest(app.getHttpServer())
        .post('/logger')
        .send(payload)
        .set('Content-Type', 'application/json');
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        message: 'Validation Failed',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  });

  it('OPTIONS /logger excludes credentials by default', async () => {
    const response = await supertest(app.getHttpServer())
      .options('/logger')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });
});

describe('Logger service e2e with auth token configured', () => {
  let app: INestApplication;
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-e2e-auth-'));
    process.env.LOGGER_CONFIG_PATH = '';
    process.env.LOGGER_TLS = 'false';
    process.env.LOGGER_CERTS_DIR = '';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = '*';
    process.env.LOGGER_LOG_FILE_PATH = path.join(tempDir, 'events.jsonl');
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '65536';
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    process.env.LOGGER_AUTH_TOKEN = 'test-secret-token';

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    delete process.env.LOGGER_AUTH_TOKEN;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('rejects POST /logger without a bearer token', async () => {
    const payload = await readPayloadFixture('sample.json');
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('rejects POST /logger with the wrong bearer token', async () => {
    const payload = await readPayloadFixture('sample.json');
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer wrong-token');
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('accepts POST /logger with the configured bearer token', async () => {
    const payload = await readPayloadFixture('sample.json');
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer test-secret-token');
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  });

  it('GET /logger/health does not require a bearer token', async () => {
    await supertest(app.getHttpServer())
      .get('/logger/health')
      .expect(HttpStatus.OK);
  });
});

describe('Logger service e2e with a configured throttle', () => {
  let app: INestApplication;
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-e2e-limit-'));
    process.env.LOGGER_CONFIG_PATH = '';
    process.env.LOGGER_TLS = 'false';
    process.env.LOGGER_CERTS_DIR = '';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = '*';
    process.env.LOGGER_LOG_FILE_PATH = path.join(tempDir, 'events.jsonl');
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '65536';
    process.env.LOGGER_THROTTLE_TTL = '60000';
    process.env.LOGGER_THROTTLE_LIMIT = '1';
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_AUTH_TOKEN;

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    delete process.env.LOGGER_THROTTLE_TTL;
    delete process.env.LOGGER_THROTTLE_LIMIT;
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_AUTH_TOKEN;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('keeps health available after logger ingest is throttled', async () => {
    const payload = await readPayloadFixture('sample.json');
    await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .expect(HttpStatus.NO_CONTENT);
    await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .expect(HttpStatus.TOO_MANY_REQUESTS);
    await supertest(app.getHttpServer())
      .get('/logger/health')
      .expect(HttpStatus.OK)
      .expect({ status: 'ok' });
  });
});

describe('Logger service e2e with production body-parser config', () => {
  let app: INestApplication;
  let logFilePath = '';
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(
      path.join(os.tmpdir(), 'dtaas-logger-e2e-textplain-'),
    );
    logFilePath = path.join(tempDir, 'events.jsonl');
    process.env.LOGGER_CONFIG_PATH = '';
    process.env.LOGGER_TLS = 'false';
    process.env.LOGGER_CERTS_DIR = '';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = '*';
    process.env.LOGGER_LOG_FILE_PATH = logFilePath;
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '65536';
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_AUTH_TOKEN;

    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    delete process.env.LOGGER_AUTH_TOKEN;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('accepts a JSON body sent with Content-Type: text/plain, as navigator.sendBeacon sends it', async () => {
    const payload = await readPayloadFixture('sample.json');
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(JSON.stringify(payload))
      .set('Content-Type', 'text/plain;charset=UTF-8');
    expect(response.status).toBe(HttpStatus.NO_CONTENT);

    const content = await readFile(logFilePath, 'utf8');
    expect(JSON.parse(content.trim())).toEqual(payload);
  });

  it.each([
    ['application/json', (payload: Record<string, unknown>) => payload],
    [
      'text/plain;charset=UTF-8',
      (payload: Record<string, unknown>) => JSON.stringify(payload),
    ],
  ])('rejects oversized %s payloads', async (contentType, body) => {
    const payload = {
      ...(await readPayloadFixture('sample.json')),
      context: { padding: 'x'.repeat(80 * 1024) },
    };
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(body(payload))
      .set('Content-Type', contentType);

    expect(response.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
  });
});
