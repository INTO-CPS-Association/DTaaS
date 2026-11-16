import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import Config from 'src/config/configuration.service';
import { digitalTwin, post, startRunner } from './fsm.util';
import Webhook from './webhook.util';

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

describe('Webhook notifications', () => {
  let dir: string;
  let app: INestApplication | undefined;
  let webhook: Webhook;

  beforeEach(async () => {
    webhook = new Webhook();
    const url = await webhook.listen();
    jest
      .spyOn(Config.prototype, 'getNotify')
      .mockReturnValue({ url, token: 'secret' });
    dir = digitalTwin('states: {create: {}}');
    app = await startRunner(join(dir, 'runner.yaml'));
  });

  afterEach(async () => {
    await app?.close();
    await webhook.close();
    rmSync(dir, { recursive: true, force: true });
    jest.restoreAllMocks();
  }, TIMEOUT);

  const running = (): INestApplication => {
    if (app === undefined) {
      throw new Error('The runner is not running');
    }
    return app;
  };

  it(
    'Should post the state document at startup and after a transition',
    async () => {
      const startup = await webhook.received((machine) => !machine?.state);
      const { status } = await post(running(), '/fsm/transition', {
        state: 'create',
      });
      const done = await webhook.received(
        (machine) => machine?.status === 'valid',
      );

      expect([status, startup.headers]).toEqual([
        HttpStatus.ACCEPTED,
        expect.objectContaining({
          'content-type': 'application/json',
          authorization: 'Bearer secret',
        }),
      ]);
      expect(done.body).toMatchObject({
        kind: 'state',
        id: 'dt-1',
        time: (done.body.data as { time: string }).time,
        data: { machine: { state: 'create', status: 'valid', entry: 1 } },
      });
    },
    TIMEOUT,
  );

  it(
    'Should post the presence at startup and the leave at shutdown',
    async () => {
      const joined = await webhook.presence(true);
      await running().close();
      app = undefined;
      const left = await webhook.presence(false);

      expect(joined.body).toMatchObject({
        kind: 'presence',
        id: 'dt-1',
        data: { online: true, descriptor: { id: 'dt-1', stateMachine: true } },
      });
      expect(left.body).toEqual({
        kind: 'presence',
        id: 'dt-1',
        time: expect.any(String),
        data: { online: false },
      });
      expect(
        webhook.posts.filter(({ body }) => body.kind === 'presence'),
      ).toHaveLength(2);
    },
    TIMEOUT,
  );
});
