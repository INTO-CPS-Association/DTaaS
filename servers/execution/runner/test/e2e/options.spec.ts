import { Test } from '@nestjs/testing';
import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';
import Keyv from 'keyv';
import Config from 'src/config/configuration.service';
import { getRequest, postRequest, queriesJSON, RequestBody } from './util';

const option = async (): Promise<Keyv> => {
  const keyv = new Keyv();
  await keyv.set('configFile', 'runner.test.yaml');
  return keyv;
};

const queryTypes: (keyof typeof queriesJSON)[] = [
  'permitted',
  'notPermitted',
  'nonExisting',
  'incorrect',
];

describe('Runner end-to-end tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const config = app.get<Config>(Config);
    config.loadConfig(await option());
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  describe('POST /', () => {
    queryTypes.forEach((key) => {
      const query = queriesJSON[key];
      it(`execute ${key} command`, () =>
        postRequest({
          app,
          route: '/',
          HttpStatus: query.HttpStatus,
          reqBody: query.reqBody,
          resBody: query.resBody.POST,
        }));
    });
  });

  describe('GET /', () => {
    queryTypes.forEach((key) => {
      const query = queriesJSON[key];
      it(`execution status of ${key} command`, async () => {
        await postRequest({
          app,
          route: '/',
          HttpStatus: query.HttpStatus,
          reqBody: query.reqBody,
          resBody: query.resBody.POST,
        });
        return getRequest({
          app,
          route: '/',
          HttpStatus: 200,
          reqBody: {},
          resBody: query.resBody.GET,
        });
      });
    });

    it('execution status without any prior command executions', () =>
      getRequest({
        app,
        route: '/',
        HttpStatus: 200,
        reqBody: {},
        resBody: {
          name: 'none',
          status: 'invalid',
          logs: { stdout: '', stderr: '' },
        },
      }));
  });

  describe('POST / with an Idempotency-Key header', () => {
    const post = (requestKey: string) =>
      supertest(app.getHttpServer())
        .post('/')
        .set('Idempotency-Key', requestKey)
        .send({ name: 'create' })
        .expect(200, { status: 'success' });

    it('refuses a key that is too long', () =>
      supertest(app.getHttpServer())
        .post('/')
        .set('Idempotency-Key', 'k'.repeat(256))
        .send({ name: 'create' })
        .expect(400, {
          message: 'Validation Failed',
          error: 'Bad Request',
          statusCode: 400,
        }));

    it('runs a repeated request only once', async () => {
      await post('key-1');
      await post('key-1');
      await post('key-2');
      await supertest(app.getHttpServer())
        .get('/history')
        .expect(200, [{ name: 'create' }, { name: 'create' }]);
    });
  });

  describe('GET /history', () => {
    it('without any prior command executions', () =>
      getRequest({
        app,
        route: '/history',
        HttpStatus: 200,
        reqBody: {},
        resBody: new Array<RequestBody>(),
      }));

    it('after multiple command executions', async () => {
      await Promise.all(
        queryTypes.map(async (key) => {
          const query = queriesJSON[key];
          await postRequest({
            app,
            route: '/',
            HttpStatus: query.HttpStatus,
            reqBody: query.reqBody,
            resBody: query.resBody.POST,
          });
        }),
      );
      return getRequest({
        app,
        route: '/history',
        HttpStatus: 200,
        reqBody: {},
        resBody: [
          { name: 'create' },
          { name: 'execute' },
          { name: 'configure' },
        ],
      });
    });
  });
});
