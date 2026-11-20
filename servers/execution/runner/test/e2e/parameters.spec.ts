import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { commandNames } from 'test/utils';
import { digitalTwin, post, settled, startRunner } from './fsm.util';

const DEFINITION = `
events: [restart, scope-changed]
parameters:
  scope:
    type: enum
    values: [single, multi]
    default: single
    controllable: true
    event: scope-changed
  capacity:
    type: number
    default: 20
states:
  create: {transitions: {$success: execute}}
  execute:
    transitions:
      restart: create
      scope-changed: {state: execute, stop: true}`;

const scope = (value: string) => ({
  value,
  type: 'enum',
  values: ['single', 'multi'],
  default: 'single',
  controllable: true,
});

const capacity = {
  value: 20,
  type: 'number',
  default: 20,
  controllable: false,
};

// PowerShell takes a second or more to start on a loaded Windows host
const SCRIPT_CHAIN_TIMEOUT = 30000;

const get = (app: INestApplication) =>
  supertest(app.getHttpServer()).get('/parameters');

const put = (app: INestApplication, body: unknown) =>
  supertest(app.getHttpServer())
    .put('/parameters')
    .send(body as object);

describe('Runner parameters end-to-end tests', () => {
  let dir: string;
  let app: INestApplication;

  beforeAll(() => {
    dir = digitalTwin(DEFINITION);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  beforeEach(async () => {
    app = await startRunner(join(dir, 'runner.yaml'));
  });

  afterEach(async () => {
    await app.close();
  });

  it('Should return the declarations and the values', async () => {
    const { status, body } = await get(app);

    expect([status, body]).toEqual([
      HttpStatus.OK,
      { scope: scope('single'), capacity },
    ]);
  });

  it('Should set a value and return the parameters', async () => {
    const reply = await put(app, { scope: 'multi' });
    const { body } = await get(app);
    const state = await supertest(app.getHttpServer()).get('/state');

    expect([reply.status, reply.body]).toEqual([
      HttpStatus.OK,
      { scope: scope('multi'), capacity },
    ]);
    expect(body.scope.value).toBe('multi');
    expect(state.body.parameters).toEqual({ scope: 'multi', capacity: 20 });
  });

  it('Should list every problem of a body and change nothing', async () => {
    const reply = await put(app, { scope: 'multi', capacity: 30, size: 1 });
    const { body } = await get(app);

    expect([reply.status, reply.body]).toEqual([
      HttpStatus.BAD_REQUEST,
      {
        message: [
          'parameter capacity is not controllable',
          'parameter size is not declared',
        ],
        error: 'Bad Request',
        statusCode: 400,
      },
    ]);
    expect(body.scope.value).toBe('single');
  });

  it('Should change nothing for an empty body', async () => {
    const { status, body } = await put(app, {});

    expect([status, body]).toEqual([
      HttpStatus.OK,
      { scope: scope('single'), capacity },
    ]);
  });

  it.each([
    ['a value that is an object', { scope: { value: 'multi' } }],
    ['a body that is a list', ['multi']],
  ])('Should refuse %s', async (_, body) => {
    const reply = await put(app, body);

    expect([reply.status, reply.body]).toEqual([
      HttpStatus.BAD_REQUEST,
      { message: 'Validation Failed', error: 'Bad Request', statusCode: 400 },
    ]);
  });

  it(
    'Should restart the script through the declared event',
    async () => {
      await post(app, '/fsm/transition', { state: 'execute' });
      await settled(app, 'execute');

      expect((await put(app, { scope: 'multi' })).status).toBe(HttpStatus.OK);
      await settled(app, 'execute');

      const { body } = await supertest(app.getHttpServer()).get('/history');
      expect(commandNames(body)).toEqual(['execute', 'execute']);
    },
    SCRIPT_CHAIN_TIMEOUT,
  );
});

describe('Runner parameters without a state machine', () => {
  it('Should answer 404 on the parameters routes', async () => {
    const dir = digitalTwin(undefined);
    const app = await startRunner(join(dir, 'runner.yaml'));
    const reply = { status: 'no state machine', state: null };

    const read = await get(app);
    const write = await put(app, { scope: 'multi' });

    expect([read.status, read.body]).toEqual([HttpStatus.NOT_FOUND, reply]);
    expect([write.status, write.body]).toEqual([HttpStatus.NOT_FOUND, reply]);
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
