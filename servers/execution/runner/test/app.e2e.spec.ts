import supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let body = {
    name: 'create',
  };

  function postRequest(route: string, HttpStatus: number, res: any) {
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

 it('/ (GET) with no prior command executions', () => {
    return supertest(app.getHttpServer()).get('/').expect(200);
  });

  it('/ (POST) with valid command', () => {
    return postRequest('/', 200,
      {
        "status": "success"
      });
  });

  it('/ (POST) with invalid command', () => {
    body = {
      name: 'configure',
    };
    return postRequest('/', 400,
      {
        "status": "invalid command"
      });
  });
});
