import supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let body = {
    name: 'create',
  };

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

  it('/ (GET) with no prior lifecycle request', () =>
    supertest(app.getHttpServer()).get('/').expect(200));

  it('/ (POST) with valid lifecycle script', () => {
    supertest(app.getHttpServer())
      .post('/')
      .send(body)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('true');

    /*
      supertest(app.getHttpServer())
      .post('/lifecycle/phase')
      .send(body)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(200)
      .then(response => {
        console.log(response.body);
        expect(response.body.status).toEqual('success');
     });
    */
  });

  it('/ (POST) with invalid lifecycle script', () => {
    body = {
      name: 'configure',
    };
    supertest(app.getHttpServer())
      .post('/lifecycle/phase')
      .send(body)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(201)
      .expect('false');
  });
});
