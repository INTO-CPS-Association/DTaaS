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
import { HistoryEntryDto } from 'src/dto/history.dto';
import ExecaManager from 'src/execa-manager.service';
import { commandNames } from 'test/utils';
import { digitalTwin, poll, post, settled, startRunner } from './fsm.util';

const DEFINITION = `
events: [restart, halt]
states:
  loop:
    transitions:
      restart: {state: loop, stop: true}
      halt: {state: create, stop: true}
      $stopped: create
  create:`;

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

const history = (app: INestApplication, names: string[]) =>
  poll(
    app,
    '/history',
    (body) =>
      JSON.stringify(commandNames(body as unknown as HistoryEntryDto[])) ===
      JSON.stringify(names),
  );

describe('Runner state machine with stopped scripts', () => {
  let dir: string;
  let app: INestApplication;

  beforeAll(() => {
    dir = digitalTwin(DEFINITION, ['loop']);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  beforeEach(async () => {
    app = await startRunner(join(dir, 'runner.yaml'));
  });

  // the runner waits for the scripts that run before it closes
  afterEach(async () => {
    await app.get(ExecaManager).stop();
    await app.close();
  }, TIMEOUT);

  it(
    'Should follow $stopped when POST /stop stops the script',
    async () => {
      await post(app, '/fsm/transition', { state: 'loop' }).expect(
        HttpStatus.ACCEPTED,
      );

      await post(app, '/stop', {}).expect(HttpStatus.OK, {
        stopped: ['loop'],
      });
      expect(await settled(app, 'create')).toMatchObject({ status: 'valid' });
      await history(app, ['loop', 'create']);
    },
    TIMEOUT,
  );

  it(
    'Should restart the script on a stop transition to the same state',
    async () => {
      await post(app, '/fsm/transition', { state: 'loop' });

      await post(app, '/fsm/event', { event: 'restart' }).expect(
        HttpStatus.ACCEPTED,
        { status: 'accepted', state: 'loop' },
      );
      await history(app, ['loop', 'loop']);
      expect(await poll(app, '/fsm', () => true)).toMatchObject({
        state: 'loop',
        status: 'running',
      });
    },
    TIMEOUT,
  );

  it(
    'Should stop the script and run the target of a stop transition',
    async () => {
      await post(app, '/fsm/transition', { state: 'loop' });

      await post(app, '/fsm/event', { event: 'halt' }).expect(
        HttpStatus.ACCEPTED,
        { status: 'accepted', state: 'create' },
      );
      expect(await settled(app, 'create')).toMatchObject({ status: 'valid' });
      await history(app, ['loop', 'create']);
    },
    TIMEOUT,
  );
});
