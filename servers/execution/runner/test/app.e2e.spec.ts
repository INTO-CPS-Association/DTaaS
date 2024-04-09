import supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  type CommandRequest = {
    name: string;
  };
  type CommandResponse = {
    status: string;
  };
  let body: CommandRequest = {
    name: 'create',
  };

  function postRequest(
    route: string,    HttpStatus: number,
    res: CommandResponse,
  ) {
    return supertest(app.getHttpServer())
      .post(route)
      .send(body)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(HttpStatus)
      .expect(res);
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

  it('/ (GET) get execution status with no prior command executions', () => {
    return supertest(app.getHttpServer()).get('/').expect(200);
  });

  it('/ (POST) execute a valid command', () => {
    return postRequest('/', 200, {
      status: 'success',
    })
  });

  it('/ (POST) execute an invalid command', () => {
    body = {
      name: 'configure',
    };
    return postRequest('/', 400, {
      status: 'invalid command',
    });
  });
});
