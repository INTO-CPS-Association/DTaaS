import supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
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

  it('/ (POST) execute a valid command', () => {
    const reqBody: RequestBody = {
      name: 'create',
    };
    return postRequest('/', 200, reqBody, {
      status: 'success',
    });
  });

  it('/ (POST) execute an invalid command', () => {
    const reqBody: RequestBody = {
      name: 'configure',
    };
    return postRequest('/', 400, reqBody, {
      status: 'invalid command',
    });
  });

  it('/ (POST) send incorrectly formed command execution request', () => {
    const reqBody: RequestBody = {
      command: 'create',
    };
    return postRequest('/', 400, reqBody, {
      message: 'Validation Failed',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  //skipped tests have not been written correctly
  it.skip('/ (GET) get execution status without any prior command executions', () =>
    getRequest(
      '/',
      200,
      {},
      { name: 'none', status: 'invalid', logs: { stdout: '', stderr: '' } },
    ));

    it.skip('/ (GET) get execution status after valid command execution', () => {
      const reqBody: RequestBody = {
        name: 'create',
      };
      postRequest('/', 200, reqBody, {
        status: 'success',
      });
      return getRequest(
        '/',
        200,
        {},
        { name: 'create', status: 'valid', logs: { stdout: '', stderr: '' } },
      );
    });  

    it.skip('/ (GET) get execution status after invalid command execution', () => {
      const reqBody: RequestBody = {
        name: 'create',
      };
      postRequest('/', 200, reqBody, {
        status: 'success',
      });
      return getRequest(
        '/',
        200,
        {},
        { name: 'create', status: 'valid', logs: { stdout: '', stderr: '' } },
      );
    });

    it('/ (GET) get history without any prior command executions', () =>
      getRequest(
        '/history',
        200,
        {},
        [],
      ));

      it.skip('/ (GET) get history after two command executions', () => {
        const reqBody: RequestBody = {
          name: 'create',
        };
        postRequest('/', 200, reqBody, {
          status: 'success',
        });
        return getRequest(
          '/history',
          200,
          {},
          [reqBody],);
      });
    
    });
