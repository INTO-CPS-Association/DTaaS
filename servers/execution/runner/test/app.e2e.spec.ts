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
        status: 'success',
      },
    },
    invalid: {
      reqBody: {
        name: 'configure',
      },
      HttpStatus: 400,
      resBody: {
        status: 'invalid command',
      },
    },
    incorrect: {
      reqBody: {
        command: 'create',
      },
      HttpStatus: 400,
      resBody: {
        message: 'Validation Failed',
        error: 'Bad Request',
        statusCode: 400,
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
    it('execute a valid command', () =>
      postRequest(
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody,
      ));

    it('execute an invalid command', () =>
      postRequest(
        '/',
        queriesJSON.invalid.HttpStatus,
        queriesJSON.invalid.reqBody,
        queriesJSON.invalid.resBody,
      ));

    it('send incorrectly formed command execution request', () =>
      postRequest(
        '/',
        queriesJSON.incorrect.HttpStatus,
        queriesJSON.incorrect.reqBody,
        queriesJSON.incorrect.resBody,
      ));
  });

  describe('GET /', () => {
    it('get execution status without any prior command executions', () =>
      getRequest(
        '/',
        200,
        {},
        { name: 'none', status: 'invalid', logs: { stdout: '', stderr: '' } },
      ));

    it('get execution status after valid command execution', async () => {
      await postRequest(
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody,
      );
      return getRequest(
        '/',
        200,
        {},
        {
          name: 'create',
          status: 'valid',
          logs: { stdout: 'hello world', stderr: '' },
        },
      );
    });

    it('get execution status after invalid command execution', async () => {
      await postRequest(
        '/',
        queriesJSON.invalid.HttpStatus,
        queriesJSON.invalid.reqBody,
        queriesJSON.invalid.resBody,
      );
      return getRequest(
        '/',
        200,
        {},
        {
          name: 'configure',
          status: 'invalid',
          logs: { stdout: '', stderr: '' },
        },
      );
    });
  });

  describe('GET /history', () => {
    it('get history without any prior command executions', () =>
      getRequest('/history', 200, {}, []));

    it('get history after two valid command executions', async () => {
      await postRequest(
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody,
      );
      await postRequest(
        '/',
        queriesJSON.valid.HttpStatus,
        queriesJSON.valid.reqBody,
        queriesJSON.valid.resBody,
      );
      return getRequest('/history', 200, {}, [
        { name: 'create' },
        { name: 'create' },
      ]);
    });
  });
});
