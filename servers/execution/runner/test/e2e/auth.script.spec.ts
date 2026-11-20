import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import Access from 'src/auth/access';
import Config from 'src/config/configuration.service';
import FsmService from 'src/fsm/fsm.service';
import { runnerUrl } from 'src/fsm/script-context';
import Queue from 'src/queue.service';
import { httpAuthorization, newCaller } from 'test/sign.util';
import { digitalTwin, startRunner } from './fsm.util';

const DEFINITION = `
events: [done]
states:
  raise-event:
    transitions:
      done: create
  create:`;

// PowerShell takes a second or more to start on a loaded Windows host
const SCRIPT_TIMEOUT = 30000;

const alice = newCaller('alice');

const pause = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 50);
  });

// Waits for the machine to settle in the state, without a credential
async function settled(fsm: FsmService, state: string): Promise<void> {
  const machine = fsm.check();
  if (machine?.state === state && machine.status !== 'running') {
    return;
  }
  await pause();
  await settled(fsm, state);
}

describe('Script token end-to-end tests', () => {
  let dir: string;
  let app: INestApplication;

  beforeAll(() => {
    dir = digitalTwin(DEFINITION, ['raise-event']);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  afterEach(() => app.close());

  // Starts the runner with alice listed, and gives its scripts the URL
  // and the token as main.ts does
  async function listenWithAccess() {
    app = await startRunner(join(dir, 'runner.yaml'));
    const { publicKey } = alice;
    const access = new Access(
      [{ name: 'alice', role: 'client', publicKey }],
      'dt-1',
    );
    jest.spyOn(app.get<Config>(Config), 'access').mockReturnValue(access);
    const enqueue = jest.spyOn(app.get<Queue>(Queue), 'enqueue');
    await app.listen(0);
    const fsm = app.get<FsmService>(FsmService);
    fsm.setRunnerApi(runnerUrl(app.getHttpServer()), access.scriptToken);
    return { access, enqueue, fsm };
  }

  it(
    'Should let a state script raise an event with RUNNER_TOKEN',
    async () => {
      const { access, enqueue, fsm } = await listenWithAccess();
      const body = JSON.stringify({ state: 'raise-event' });
      const call = { method: 'POST', path: '/fsm/transition', body };

      const reply = await supertest(app.getHttpServer())
        .post('/fsm/transition')
        .set('Authorization', httpAuthorization(alice, 'dt-1', call))
        .set('Content-Type', 'application/json')
        .send(body);
      await settled(fsm, 'create');

      expect(reply.status).toBe(202);
      expect(fsm.environment('x').RUNNER_TOKEN).toBe(access.scriptToken);
      // a state's script has no caller, so its by is NULL
      expect(enqueue.mock.calls).toEqual([
        ['raise-event', undefined, undefined],
        ['create', undefined, undefined],
      ]);
    },
    SCRIPT_TIMEOUT,
  );

  it('Should set no RUNNER_TOKEN without access control', async () => {
    app = await startRunner(join(dir, 'runner.yaml'));

    expect(app.get<Config>(Config).access()).toBeUndefined();
    expect(app.get<FsmService>(FsmService).environment('x')).not.toHaveProperty(
      'RUNNER_TOKEN',
    );
  });
});
