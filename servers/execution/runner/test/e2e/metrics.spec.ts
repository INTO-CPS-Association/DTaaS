import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { configFilename } from 'test/utils';
import { digitalTwin, post, settled, startRunner } from './fsm.util';

const DEFINITION = `
events: [stop]
states:
  create: {transitions: {$success: execute}}
  execute: {transitions: {stop: terminate}}
  terminate:`;

const NO_ESCALATIONS = { request: 0, failure: 0, 'no-transition': 0 };

// The machine after a transition to create, which runs on to execute,
// stop to terminate, and stop again without a transition
const MACHINE = {
  entries: { create: 1, execute: 1, terminate: 1 },
  seconds: {
    create: expect.any(Number),
    execute: expect.any(Number),
    terminate: expect.any(Number),
  },
  completions: { $success: 3, $failure: 0, $stopped: 0 },
  transitions: { requested: 1, accepted: 1 },
  events: { requested: 2, accepted: 1, noTransition: 1 },
};

// PowerShell takes a second or more to start on a loaded Windows host,
// and this test runs four scripts
const SCRIPT_CHAIN_TIMEOUT = 40000;

const metrics = (app: INestApplication) =>
  supertest(app.getHttpServer()).get('/metrics').expect(HttpStatus.OK);

describe('GET /metrics', () => {
  let app: INestApplication;
  let dir: string | undefined;

  afterEach(async () => {
    await app.close();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts the commands, without a state machine', async () => {
    app = await startRunner(configFilename);
    await post(app, '/', { name: 'configure' });

    const { body } = await metrics(app);

    expect(body).toEqual({
      since: new Date(performance.timeOrigin).toISOString(),
      uptime: expect.any(Number),
      commands: {
        valid: 0,
        failed: 0,
        stopped: 0,
        invalid: 1,
        interrupted: 0,
        running: 0,
      },
      resources: {},
      machine: null,
      escalations: NO_ESCALATIONS,
    });
  });

  it(
    'counts what the state machine did since the start',
    async () => {
      dir = digitalTwin(DEFINITION);
      app = await startRunner(join(dir, 'runner.yaml'));

      await post(app, '/fsm/transition', { state: 'create' });
      await settled(app, 'execute');
      await post(app, '/fsm/event', { event: 'stop' });
      await settled(app, 'terminate');
      await post(app, '/fsm/event', { event: 'stop' });
      await post(app, '/', { name: 'create' });

      const { body } = await metrics(app);

      expect(body.commands).toMatchObject({ valid: 4, running: 0 });
      expect(body.machine).toEqual(MACHINE);
      expect(body.escalations).toEqual(NO_ESCALATIONS);
    },
    SCRIPT_CHAIN_TIMEOUT,
  );
});
