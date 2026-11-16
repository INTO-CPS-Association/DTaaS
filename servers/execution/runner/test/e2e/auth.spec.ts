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
  jest,
} from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import Access from 'src/auth/access';
import Config from 'src/config/configuration.service';
import Queue from 'src/queue.service';
import {
  bodyHash,
  Caller,
  httpAuthorization,
  HttpCall,
  newCaller,
  signToken,
  timeClaims,
} from 'test/sign.util';
import { digitalTwin, startRunner } from './fsm.util';

const DEFINITION = `
events: [close]
states:
  create:
  execute:
manager:
  commands: [create]`;

const alice = newCaller('alice');
const manager = newCaller('manager-1');

const unauthorized = (message: string) => ({
  statusCode: 401,
  message,
  error: 'Unauthorized',
});

const forbidden = (message: string) => ({
  statusCode: 403,
  message,
  error: 'Forbidden',
});

describe('Access control end-to-end tests', () => {
  let dir: string;
  let app: INestApplication;
  let access: Access;

  const http = () => supertest(app.getHttpServer());

  // A request signed by the caller for this call, which it describes
  function send(caller: Caller, { method, path, body }: HttpCall) {
    const header = httpAuthorization(caller, 'dt-1', { method, path, body });
    const request = method === 'GET' ? http().get(path) : http().post(path);
    request.set('Authorization', header);
    return body === undefined
      ? request
      : request.set('Content-Type', 'application/json').send(body);
  }

  beforeAll(() => {
    dir = digitalTwin(DEFINITION);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  beforeEach(async () => {
    app = await startRunner(join(dir, 'runner.yaml'));
    access = new Access(
      [
        { name: 'alice', role: 'client', publicKey: alice.publicKey },
        { name: 'manager-1', role: 'manager', publicKey: manager.publicKey },
      ],
      'dt-1',
    );
    jest.spyOn(app.get<Config>(Config), 'access').mockReturnValue(access);
  });

  afterEach(() => app.close());

  it('Should answer GET /health without a credential', async () => {
    const { status } = await http().get('/health');

    expect(status).toBe(200);
  });

  it('Should answer a client with a valid token', async () => {
    const { status, body } = await send(alice, { method: 'GET', path: '/dt' });

    expect(status).toBe(200);
    expect(body.id).toBe('dt-1');
  });

  it('Should refuse a request without a credential', async () => {
    const { status, body } = await http().get('/state');

    expect(status).toBe(401);
    expect(body).toEqual(unauthorized('missing credential'));
  });

  it.each([
    ['a Digest header', 'Digest username=alice', 'malformed credential'],
    [
      'a token of three parts that are not JSON',
      'Bearer a.b.c',
      'malformed credential',
    ],
    ['a wrong script token', `Bearer ${'A'.repeat(43)}`, 'invalid credential'],
  ])('Should refuse %s', async (_, header, message) => {
    const { body } = await http().get('/state').set('Authorization', header);

    expect(body).toEqual(unauthorized(message));
  });

  it('Should refuse the token of an unknown principal', async () => {
    const { body } = await send(newCaller('alice'), {
      method: 'GET',
      path: '/state',
    });

    expect(body).toEqual(unauthorized('invalid credential'));
  });

  it('Should refuse an expired token', async () => {
    const claims = {
      ...timeClaims('dt-1', Date.now() - 120000),
      htm: 'GET',
      htu: '/state',
      bh: bodyHash(),
    };
    const token = signToken(
      alice.privateKey,
      { alg: 'Ed25519', kid: 'alice' },
      claims,
    );

    const { body } = await http()
      .get('/state')
      .set('Authorization', `Bearer ${token}`);

    expect(body).toEqual(unauthorized('expired credential'));
  });

  it('Should refuse a token of another route, and a replayed one', async () => {
    const header = httpAuthorization(alice, 'dt-1', {
      method: 'GET',
      path: '/state',
    });

    const other = await http().get('/dt').set('Authorization', header);
    const first = await http().get('/state').set('Authorization', header);
    const again = await http().get('/state').set('Authorization', header);

    expect(other.body).toEqual(
      unauthorized('credential does not match the request'),
    );
    expect(first.status).toBe(200);
    expect(again.body).toEqual(unauthorized('replayed credential'));
  });

  it('Should accept a path with the prefix of a gateway', async () => {
    const header = httpAuthorization(alice, 'dt-1', {
      method: 'GET',
      path: '/user1/runner/state',
    });

    const { status } = await http().get('/state').set('Authorization', header);

    expect(status).toBe(200);
  });

  it('Should run a listed command of a manager and store its name', async () => {
    const enqueue = jest.spyOn(app.get<Queue>(Queue), 'enqueue');
    const body = JSON.stringify({ name: 'create' });

    const { status } = await send(manager, { method: 'POST', path: '/', body });

    expect(status).toBe(200);
    expect(enqueue).toHaveBeenCalledWith('create', undefined, 'manager-1');
  });

  // htu is the path without the query, as the runner receives it
  it('Should show the caller in the history, and serve the metrics', async () => {
    const body = JSON.stringify({ name: 'create' });
    await send(manager, { method: 'POST', path: '/', body });
    const get = { method: 'GET', path: '/history' } as const;
    const header = httpAuthorization(manager, 'dt-1', get);

    const history = await http()
      .get('/history?limit=1')
      .set('Authorization', header);
    const metrics = await send(manager, { method: 'GET', path: '/metrics' });

    expect(history.body).toEqual([
      expect.objectContaining({ name: 'create', by: 'manager-1' }),
    ]);
    expect(metrics.status).toBe(200);
  });

  it.each([
    ['POST /', '/', { name: 'execute' }, 'manager may not call execute'],
    ['POST /stop', '/stop', {}, 'manager may not call stop'],
    [
      'an invalid transition',
      '/fsm/transition',
      { x: 1 },
      'manager may not call transition',
    ],
  ])('Should refuse a manager %s', async (_, path, request, message) => {
    const body = JSON.stringify(request);

    const reply = await send(manager, { method: 'POST', path, body });

    expect(reply.body).toEqual(forbidden(message));
  });

  it('Should check the credential before the body', async () => {
    const { body } = await http()
      .post('/fsm/event')
      .set('Content-Type', 'application/json')
      .send('{"x":1}');

    expect(body).toEqual(unauthorized('missing credential'));
  });

  it('Should take the script token in the role script', async () => {
    const token = `Bearer ${access.scriptToken}`;

    const state = await http().get('/state').set('Authorization', token);
    const command = await http()
      .post('/')
      .set('Authorization', token)
      .send({ name: 'create' });

    expect(state.status).toBe(200);
    expect(command.body).toEqual(forbidden('script may not call execute'));
  });
});
