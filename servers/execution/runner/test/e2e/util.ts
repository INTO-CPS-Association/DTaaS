import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';

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

export function postRequest(
  app: INestApplication,
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

export function getRequest(
  app: INestApplication,
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

export const queriesJSON = {
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
      GET: {
        name: 'none',
        status: 'invalid',
        logs: { stdout: '', stderr: '' },
      },
    },
  },
};
