import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import FsmService from 'src/fsm/fsm.service';
import { runnerUrl } from 'src/fsm/script-context';
import { commandNames } from 'test/utils';
import { digitalTwin, post, settled, startRunner } from './fsm.util';

const DEFINITION = `
events: [done]
parameters:
  scope:
    type: enum
    values: [single, multi]
    default: single
env:
  HINT: '\${DT_ID}-\${DT_PARAM_SCOPE}'
states:
  print-context:
  raise-event:
    transitions:
      done: create
  create:`;

const SCRIPTS = ['print-context', 'raise-event'];

// PowerShell takes a second or more to start on a loaded Windows host
const SCRIPT_TIMEOUT = 30000;

// The stdout of the latest command
const stdout = async (app: INestApplication): Promise<string> => {
  const { body } = await supertest(app.getHttpServer()).get('/');
  return body.logs.stdout;
};

describe('Runner context of scripts end-to-end tests', () => {
  const dirs: string[] = [];
  let app: INestApplication;

  const start = async (definition?: string) => {
    const dir = digitalTwin(definition, SCRIPTS);
    dirs.push(dir);
    app = await startRunner(join(dir, 'runner.yaml'));
  };

  afterEach(() => app.close());

  afterAll(() =>
    dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
  );

  it(
    'Should give the script of a state its entry, parameters and env',
    async () => {
      await start(DEFINITION);

      await post(app, '/fsm/transition', { state: 'print-context' });
      await settled(app, 'print-context');

      expect(await stdout(app)).toBe('dt-1 print-context 1 single dt-1-single');
    },
    SCRIPT_TIMEOUT,
  );

  it(
    'Should give a script of POST / the machine before its first transition',
    async () => {
      await start(DEFINITION);

      const { body } = await post(app, '/', { name: 'print-context' });

      expect(body).toMatchObject({ status: 'success' });
      expect(await stdout(app)).toBe('dt-1  0 single dt-1-single');
    },
    SCRIPT_TIMEOUT,
  );

  it(
    'Should give a script only the identity without a state machine',
    async () => {
      await start(undefined);

      await post(app, '/', { name: 'print-context' });

      expect((await stdout(app)).trim()).toBe('dt-1');
    },
    SCRIPT_TIMEOUT,
  );

  it(
    'Should let a script raise an event through RUNNER_URL',
    async () => {
      await start(DEFINITION);
      await app.listen(0);
      const url = runnerUrl(app.getHttpServer());
      app.get<FsmService>(FsmService).setRunnerApi(url, undefined);

      await post(app, '/fsm/transition', { state: 'raise-event' });
      await settled(app, 'create');
      const { body: history } = await supertest(app.getHttpServer()).get(
        '/history',
      );

      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(commandNames(history)).toEqual(['raise-event', 'create']);
    },
    SCRIPT_TIMEOUT,
  );
});
