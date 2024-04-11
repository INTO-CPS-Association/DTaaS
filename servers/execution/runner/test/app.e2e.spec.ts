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
  }

  function postRequest(route: string, HttpStatus: number, reqBody: RequestBody, resBody: ResponseBody) {
    return supertest(app.getHttpServer())
      .post(route)
      .send(reqBody)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(HttpStatus)
      .expect(resBody);
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
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
    return postRequest('/', 400,  reqBody, {
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

  it('/ (GET) get execution status after no prior command executions', () =>
    supertest(app.getHttpServer()).get('/').expect(200));

});
