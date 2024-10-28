import { Test } from '@nestjs/testing';
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
