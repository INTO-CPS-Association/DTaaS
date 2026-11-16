import { appendFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import { digitalTwin, post, settled } from './fsm.util';
import { startStoredRunner } from './util';

// loop runs until it is stopped and has no completion transitions
const DEFINITION = `
events: [halt]
states:
  loop:
    transitions:
      halt: create
  create:`;

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

const get = async (app: INestApplication, route: string) =>
  (await supertest(app.getHttpServer()).get(route)).body;

// The runner waits for the scripts that run before it closes
async function stopRunner(app: INestApplication): Promise<void> {
  await app.get(ExecaManager).stop();
  await app.close();
}

describe('Runner restarts', () => {
  let dir: string;
  // The runners a test started and has not closed
  let apps: INestApplication[] = [];

  async function start(): Promise<INestApplication> {
    const app = await startStoredRunner(join(dir, 'runner.yaml'));
    apps.push(app);
    return app;
  }

  // A runner that the test closes itself, as a restart does
  function closed(app: INestApplication): INestApplication {
    apps = apps.filter((open) => open !== app);
    return app;
  }

  // Enters loop, whose script runs until it is stopped
  async function startLoop(): Promise<INestApplication> {
    const app = await start();
    const { status } = await post(app, '/fsm/transition', { state: 'loop' });
    expect(status).toBe(HttpStatus.ACCEPTED);
    return app;
  }

  beforeEach(() => {
    dir = digitalTwin(DEFINITION, ['loop']);
    appendFileSync(join(dir, 'runner.yaml'), 'database: runner.db\n');
  });

  // Windows refuses to remove a database file that is open, so the
  // runners close first, even after a failed assertion
  afterEach(async () => {
    try {
      await Promise.all(apps.map(stopRunner));
    } finally {
      apps = [];
      rmSync(dir, { recursive: true, force: true });
    }
  }, TIMEOUT);

  it(
    'Should report the script of a killed runner as interrupted',
    async () => {
      const first = await startLoop();
      const db = new DatabaseSync(join(dir, 'runner.db'), { timeout: 5000 });
      const machine = db.prepare('SELECT state, entry, status FROM machine');
      expect(machine.get()).toEqual({
        state: 'loop',
        entry: 1,
        status: 'running',
      });
      await stopRunner(closed(first));
      // as a killed runner leaves them
      db.exec("UPDATE machine SET status = 'running'");
      db.exec('UPDATE commands SET finished_at = NULL');
      db.close();

      const second = await start();
      const fsm = { state: 'loop', status: 'interrupted', entry: 1 };
      expect(await get(second, '/fsm')).toMatchObject(fsm);
      expect(await get(second, '/')).toMatchObject({
        name: 'loop',
        status: 'interrupted',
      });
      expect((await get(second, '/state')).command).toMatchObject({
        name: 'loop',
        status: 'interrupted',
      });
      const { status } = await post(second, '/fsm/transition', {
        state: 'create',
      });
      expect(status).toBe(HttpStatus.ACCEPTED);
      expect(await settled(second, 'create')).toMatchObject({ entry: 2 });
    },
    TIMEOUT,
  );

  it(
    'Should store the status of a script stopped during shutdown',
    async () => {
      const first = await startLoop();
      const service = first.get(FsmService);
      const original = service.beforeApplicationShutdown.bind(service);
      jest
        .spyOn(service, 'beforeApplicationShutdown')
        .mockImplementation(() => {
          original();
          void first.get(ExecaManager).stop();
        });
      await closed(first).close();

      const second = await start();
      expect(await get(second, '/fsm')).toMatchObject({
        state: 'loop',
        status: 'stopped',
        entry: 1,
      });
    },
    TIMEOUT,
  );
});
