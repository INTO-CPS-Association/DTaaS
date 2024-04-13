import supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';

describe('Runner end-to-end tests', () => {
  interface RequestBody {
    name?: string;
    command?: string;
  }
  interface ResponseBody {
    message?: string;
    error?: string;
    statusCode?: number;
    status?: string;
    name?: string;
    logs?: { stdout: string; stderr: string };
  }

  function postRequest(
    route: string,
    HttpStatus: number,
    reqBody: RequestBody,
    resBody: ResponseBody,
  ) {
    return supertest(app.getHttpServer())
      .post(route)
      .send(reqBody)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(HttpStatus)
      .expect(resBody);
  }

  function getRequest(
    route: string,
    HttpStatus: number,
    reqBody: RequestBody,
    resBody: ResponseBody | RequestBody[],
  ) {
    return supertest(app.getHttpServer())
      .get(route)
      .send(reqBody)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(HttpStatus)
      .expect(resBody);
  }

  const queriesJSON = {
    valid: {
      reqBody: {
        name: 'create',
      },
      HttpStatus: 200,
      resBody: {
        POST: {
          status: 'success',
        },
        GET: {
          name: 'create',
          status: 'valid',
          logs: { stdout: 'hello world', stderr: '' },
        },
      }, 
    },
    invalid: {
      reqBody: {
        name: 'configure',
      },
      HttpStatus: 400,
      resBody: {
        POST: {
          status: 'invalid command',
        },
        GET: {
          name: 'configure',
          status: 'invalid',
          logs: { stdout: '', stderr: '' },
        },
      }, 
    },
    incorrect: {
      reqBody: {
        command: 'create',
      },
      HttpStatus: 400,
      resBody: {
        POST: {
          message: 'Validation Failed',
          error: 'Bad Request',
          statusCode: 400,
        },
        GET: { name: 'none', status: 'invalid', logs: { stdout: '', stderr: '' } },
      },
    },
  };

  let app: INestApplication;
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /', () => {
    let key: keyof typeof queriesJSON;
    for(key in queriesJSON) {
      const query = queriesJSON[key];
      it(`execute ${key} command`, () =>
        postRequest(
          '/',
          query.HttpStatus,
          query.reqBody,
          query.resBody.POST,
        ));
    }
  });

  describe('GET /', () => {
    let key: keyof typeof queriesJSON;
    for(key in queriesJSON) {
      const query = queriesJSON[key];
      it(`execution status of ${key} command`, async () => {
        await postRequest(
          '/',
          query.HttpStatus,
          query.reqBody,
          query.resBody.POST,
        );
        return getRequest(
          '/',
          200,
          {},
          query.resBody.GET
        );
      });
    }

    it('execution status without any prior command executions', () =>
    getRequest(
      '/',
      200,
      {},
      { name: 'none', status: 'invalid', logs: { stdout: '', stderr: '' } },
    ));  
  });

  describe('GET /history', () => {
    it('without any prior command executions', () =>
      getRequest('/history', 200, {}, []));

    it('after two valid command executions', async () => {
      await postRequest(
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody.POST,
      );
      await postRequest(
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody.POST,
      );
      return getRequest('/history', 200, {}, [
        { name: 'create' },
        { name: 'create' },
      ]);
    });
  });
});
