import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { configFilename, MEASURED, UNMEASURED } from 'test/utils';
import { startRunner } from './util';

// An ISO 8601 UTC time, to the second, as the history returns it
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/;

describe('GET /history', () => {
  let app: INestApplication;

  const history = (query = '') =>
    supertest(app.getHttpServer()).get(`/history${query}`);

  // a permitted command, and one that is not permitted
  beforeAll(async () => {
    app = await startRunner(configFilename);
    const server = app.getHttpServer();
    await supertest(server).post('/').send({ name: 'create' });
    await supertest(server).post('/').send({ name: 'configure' });
  }, 30000);

  afterAll(() => app.close());

  it('returns every record, oldest first', async () => {
    const { body } = await history().expect(HttpStatus.OK);

    expect(body).toEqual([
      {
        id: 1,
        name: 'create',
        status: 'valid',
        exitCode: 0,
        receivedAt: expect.stringMatching(ISO_TIME),
        finishedAt: expect.stringMatching(ISO_TIME),
        by: null,
        resources: MEASURED,
      },
      {
        id: 2,
        name: 'configure',
        status: 'invalid',
        exitCode: null,
        receivedAt: expect.stringMatching(ISO_TIME),
        finishedAt: expect.stringMatching(ISO_TIME),
        by: null,
        resources: UNMEASURED,
      },
    ]);
  });

  it('returns the newest records within the limit', async () => {
    const { body } = await history('?limit=1').expect(HttpStatus.OK);

    expect(body).toEqual([expect.objectContaining({ id: 2 })]);
  });

  it('returns the records received since a time', async () => {
    const [first] = (await history()).body;
    const since = encodeURIComponent(first.receivedAt);

    const all = await history(`?since=${since}&page=2`).expect(HttpStatus.OK);
    const none = await history('?since=2999-01-01T00:00:00%2B01:00');

    expect(all.body).toHaveLength(2);
    expect(none.body).toEqual([]);
  });

  it.each([
    'limit=0',
    'limit=1001',
    'limit=1.5',
    'since=yesterday',
    // a + that is not percent-encoded arrives as a space
    'since=2026-10-26T16:56:00+02:00',
    'limit=1&limit=2',
  ])('refuses %s', async (query) => {
    const { body } = await history(`?${query}`).expect(HttpStatus.BAD_REQUEST);

    expect(body).toEqual({
      message: 'Validation Failed',
      error: 'Bad Request',
      statusCode: 400,
    });
  });
});
