import supertest from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import AppModule from 'src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

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

  it('/phase (GET)', () =>
    supertest(app.getHttpServer())
      .get('/phase')
      .expect(200)
      .expect('["hello"]'));

  it('/ (POST) with valid lifecycle script', () => {
    const body = {
      name: 'create',
    };

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
    const body = {
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
