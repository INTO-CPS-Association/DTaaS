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

  it('/lifecycle/phase (GET)', () =>
    supertest(app.getHttpServer())
      .get('/lifecycle/phase')
      .expect(200)
      .expect('true'));
});
