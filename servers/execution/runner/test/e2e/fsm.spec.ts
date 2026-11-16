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
events: [stop]
states:
  create: {transitions: {$success: execute}}
  execute: {transitions: {stop: terminate}}
  terminate:`;

// PowerShell takes a second or more to start on a loaded Windows host,
// so a test that runs three scripts in turn needs more than the default
const SCRIPT_CHAIN_TIMEOUT = 30000;

describe('Runner state machine end-to-end tests', () => {
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

  it(
    'Should run the scripts from state to state',
    async () => {
      await supertest(app.getHttpServer())
        .get('/fsm')
        .expect(HttpStatus.OK, {
          state: null,
          status: 'none',
          entry: 0,
          events: ['stop'],
        });

      await post(app, '/fsm/transition', { state: 'create' }).expect(
        HttpStatus.ACCEPTED,
        { status: 'accepted', state: 'create' },
      );
      expect(await settled(app, 'execute')).toMatchObject({ status: 'valid' });

      await post(app, '/fsm/event', { event: 'stop' }).expect(
        HttpStatus.ACCEPTED,
        { status: 'accepted', state: 'terminate' },
      );
      await settled(app, 'terminate');
      const { body } = await supertest(app.getHttpServer())
        .get('/history')
        .expect(HttpStatus.OK);
      expect(commandNames(body)).toEqual(['create', 'execute', 'terminate']);
    },
    SCRIPT_CHAIN_TIMEOUT,
  );

  it('Should refuse an undeclared state and an event without a transition', async () => {
    const state = await post(app, '/fsm/transition', { state: 'configure' });
    const event = await post(app, '/fsm/event', { event: 'stop' });

    expect([state.status, state.body]).toEqual([
      HttpStatus.BAD_REQUEST,
      { status: 'invalid state', state: null },
    ]);
    expect([event.status, event.body]).toEqual([
      HttpStatus.CONFLICT,
      { status: 'no transition', state: null },
    ]);
  });

  it('Should replay the reply to a repeated request key', async () => {
    const request = () =>
      post(app, '/fsm/transition', { state: 'terminate' })
        .set('Idempotency-Key', 'key-1')
        .expect(HttpStatus.ACCEPTED);

    await request();
    await settled(app, 'terminate');
    await request();
    const { body } = await supertest(app.getHttpServer())
      .get('/history')
      .expect(HttpStatus.OK);
    expect(commandNames(body)).toEqual(['terminate']);
  });

  it.each([
    ['/fsm/transition', { name: 'create' }, 'key'],
    ['/fsm/event', { event: 'stop' }, 'k'.repeat(256)],
  ])('Should refuse a malformed request to %s', async (route, body, key) =>
    post(app, route, body)
      .set('Idempotency-Key', key)
      .expect(HttpStatus.BAD_REQUEST, {
        message: 'Validation Failed',
        error: 'Bad Request',
        statusCode: 400,
      }),
  );
});

describe('Runner without a state machine', () => {
  it('Should answer 404 on the state machine routes', async () => {
    const dir = digitalTwin(undefined);
    const app = await startRunner(join(dir, 'runner.yaml'));
    const reply = { status: 'no state machine', state: null };

    await supertest(app.getHttpServer())
      .get('/fsm')
      .expect(HttpStatus.NOT_FOUND, reply);
    await post(app, '/fsm/event', { event: 'stop' }).expect(
      HttpStatus.NOT_FOUND,
      reply,
    );
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
