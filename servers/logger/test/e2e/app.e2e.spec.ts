import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import supertest from 'supertest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import AppModule from 'src/app.module';

describe('Logger service e2e', () => {
  let app: INestApplication;
  let logFilePath = '';
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-e2e-'));
    logFilePath = path.join(tempDir, 'events.jsonl');
    process.env.LOGGER_LOG_FILE_PATH = logFilePath;
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '65536';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

  it('POST /logger persists valid events', async () => {
    const event = {
      sessionId: '4a4f6d5f-818d-4c86-b5dc-0d4f8a38dc02',
      userHash:
        'a3f2b8c1d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678',
      timestamp: '2026-03-24T20:00:00.000Z',
      event: 'click',
      page: '/library',
      element: 'tab',
      label: 'Functions',
      context: {
        tab: 'functions',
      },
    };

    await supertest(app.getHttpServer())
      .post('/logger')
      .send(event)
      .set('Content-Type', 'application/json')
      .expect(HttpStatus.NO_CONTENT);

    const content = await readFile(logFilePath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual(event);
  });

  it('POST /logger rejects invalid payload', async () => {
    await supertest(app.getHttpServer())
      .post('/logger')
      .send({
        page: '/library',
      })
      .set('Content-Type', 'application/json')
      .expect(HttpStatus.BAD_REQUEST)
      .expect({
        message: 'Validation Failed',
        error: 'Bad Request',
        statusCode: 400,
      });
  });
});
