import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Keyv from 'keyv';
import supertest from 'supertest';
import AppModule from 'src/app.module';
import Config from 'src/config/configuration.service';
import { configFilename, MEASURED } from 'test/utils';
import { poll } from './fsm.util';

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

describe('POST /stop', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ logger: false });
    const options = new Keyv();
    await options.set('configFile', configFilename);
    await app.get<Config>(Config).loadConfig(options);
    await app.init();
  });

  afterEach(async () => {
    await supertest(app.getHttpServer()).post('/stop');
    await app.close();
  }, TIMEOUT);

  const stop = () => supertest(app.getHttpServer()).post('/stop');

  it('Should stop nothing when nothing runs', async () => {
    const replies = [
      await stop(),
      await stop().send({}),
      await stop().send({ name: 'loop' }),
    ].map(({ status, body }) => [status, body]);

    expect(replies).toEqual(Array(3).fill([HttpStatus.OK, { stopped: [] }]));
  });

  it(
    'Should stop a running command and answer its request with stopped',
    async () => {
      const run = supertest(app.getHttpServer())
        .post('/')
        .send({ name: 'loop' })
        .then((response) => response);
      await poll(app, '/', (body) => body.name === 'loop');

      await stop()
        .send({ name: 'loop' })
        .expect(HttpStatus.OK, { stopped: ['loop'] });

      const { status, body } = await run;
      expect([status, body]).toEqual([
        HttpStatus.OK,
        {
          status: 'stopped',
          result: {
            exitCode: null,
            stdout: '',
            stderr: '',
            resources: MEASURED,
          },
        },
      ]);
      const latest = await supertest(app.getHttpServer()).get('/');
      expect(latest.body).toEqual({
        name: 'loop',
        status: 'stopped',
        logs: { stdout: '', stderr: '' },
        exitCode: null,
        resources: MEASURED,
      });
    },
    TIMEOUT,
  );

  it('Should refuse a malformed request', async () => {
    const { status, body } = await stop().send({ name: 5 });

    expect([status, body]).toEqual([
      HttpStatus.BAD_REQUEST,
      {
        message: 'Validation Failed',
        error: 'Bad Request',
        statusCode: 400,
      },
    ]);
  });
});
