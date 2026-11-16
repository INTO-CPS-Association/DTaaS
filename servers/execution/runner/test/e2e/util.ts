import { expect } from '@jest/globals';
import supertest from 'supertest';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Keyv from 'keyv';
import AppModule from 'src/app.module';
import Config from 'src/config/configuration.service';
import FsmService from 'src/fsm/fsm.service';
import Queue from 'src/queue.service';
import { MEASURED, UNMEASURED } from 'test/utils';

// Loads the configuration file given and the state machine it names
async function configure(app: INestApplication, configFile: string) {
  const options = new Keyv();
  await options.set('configFile', configFile);
  const config = app.get<Config>(Config);
  await config.loadConfig(options);
  app.get<FsmService>(FsmService).load();
  return config;
}

async function createApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  return moduleFixture.createNestApplication({ logger: false, rawBody: true });
}

// Starts the runner with the configuration file given, without MQTT and
// with its database in memory, whatever the file names
export async function startRunner(
  configFile: string,
): Promise<INestApplication> {
  const app = await createApp();
  await configure(app, configFile);
  await app.init();
  return app;
}

// Starts the runner as main.ts does, with its database and the machine
// stored there, but without MQTT
export async function startStoredRunner(
  configFile: string,
): Promise<INestApplication> {
  const app = await createApp();
  const config = await configure(app, configFile);
  app.get<Queue>(Queue).open(config.getDatabase());
  app.get<FsmService>(FsmService).restore();
  await app.init();
  return app;
}

export interface RequestBody {
  name?: string;
  command?: string;
}

type ResponseBody = {
  message?: string;
  error?: string;
  statusCode?: number;
  status?: string;
  name?: string;
  logs?: { stdout: string; stderr: string };
  exitCode?: number | null;
  resources?: unknown;
  result?: {
    exitCode: number | null;
    stdout: string;
    stderr: string;
    resources: unknown;
  };
};

type Query = {
  app: INestApplication;
  route: string;
  HttpStatus: number;
  reqBody: RequestBody;
  resBody: ResponseBody | Array<RequestBody>;
};

// The bodies may hold Jest matchers, which supertest does not take
export async function postRequest(query: Query) {
  const { body } = await supertest(query.app.getHttpServer())
    .post(query.route)
    .send(query.reqBody)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .expect(query.HttpStatus);
  expect(body).toEqual(query.resBody);
}

export async function getRequest(query: Query) {
  const { body } = await supertest(query.app.getHttpServer())
    .get(query.route)
    .send(query.reqBody)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .expect(query.HttpStatus);
  expect(body).toEqual(query.resBody);
}

const invalidQuery = (name: string) => ({
  reqBody: {
    name,
  },
  HttpStatus: HttpStatus.BAD_REQUEST,
  resBody: {
    POST: {
      status: 'invalid command',
    },
    GET: {
      name,
      status: 'invalid',
      logs: { stdout: '', stderr: '' },
      exitCode: null,
      resources: UNMEASURED,
    },
  },
});

export const queriesJSON = {
  permitted: {
    reqBody: {
      name: 'create',
    },
    HttpStatus: HttpStatus.OK,
    resBody: {
      POST: {
        status: 'success',
        result: {
          exitCode: 0,
          stdout: 'hello world',
          stderr: '',
          resources: MEASURED,
        },
      },
      GET: {
        name: 'create',
        status: 'valid',
        logs: { stdout: 'hello world', stderr: '' },
        exitCode: 0,
        resources: MEASURED,
      },
    },
  },
  notPermitted: invalidQuery('execute'),
  nonExisting: invalidQuery('configure'),
  incorrect: {
    reqBody: {
      command: 'create',
    },
    HttpStatus: HttpStatus.BAD_REQUEST,
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
        exitCode: null,
        resources: UNMEASURED,
      },
    },
  },
};
