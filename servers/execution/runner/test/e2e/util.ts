import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface RequestBody{
  name?: string;
  command?: string;
};

type ResponseBody = {
  message?: string;
  error?: string;
  statusCode?: number;
  status?: string;
  name?: string;
  logs?: { stdout: string; stderr: string };
};

type Query = {
  'app': INestApplication,
  'route': string,
  'HttpStatus': number,
  'reqBody': RequestBody,
  'resBody': ResponseBody | Array<RequestBody>,  
};

export function postRequest(query: Query) {
  return supertest(query.app.getHttpServer())
    .post(query.route)
    .send(query.reqBody)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .expect(query.HttpStatus)
    .expect(query.resBody);
}

export function getRequest(query: Query) {
  return supertest(query.app.getHttpServer())
    .get(query.route)
    .send(query.reqBody)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .expect(query.HttpStatus)
    .expect(query.resBody);
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
