import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { digitalTwin, poll, post, startRunner } from './fsm.util';

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type PolledCommand = { status?: string } | null;

describe('GET /state', () => {
  let dir: string;
  let app: INestApplication;

  const start = async (definition: string | undefined) => {
    dir = digitalTwin(definition, ['loop']);
    app = await startRunner(join(dir, 'runner.yaml'));
  };

  const state = () => supertest(app.getHttpServer()).get('/state');

  afterEach(async () => {
    await post(app, '/stop', {});
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }, TIMEOUT);

  it('Should answer without a state machine or a command', async () => {
    await start(undefined);

    const { status, body } = await state();

    expect([status, body]).toEqual([
      HttpStatus.OK,
      {
        id: 'dt-1',
        time: expect.stringMatching(ISO_TIME),
        machine: null,
        parameters: {},
        command: null,
      },
    ]);
  });

  it('Should include the state machine before its first transition', async () => {
    await start('states: {create: {}}');

    const { status, body } = await state();

    expect(status).toBe(HttpStatus.OK);
    expect(body.machine).toEqual({
      state: null,
      status: 'none',
      entry: 0,
      events: [],
    });
  });

  it(
    'Should show a running command, and its status once it has stopped',
    async () => {
      await start(undefined);
      // supertest sends a request when it is awaited, so start it now
      const run = Promise.resolve(post(app, '/', { name: 'loop' }));

      const running = await poll(
        app,
        '/state',
        (body) => (body.command as PolledCommand)?.status === 'running',
      );
      expect(running.command).toEqual({
        name: 'loop',
        status: 'running',
        receivedAt: expect.stringMatching(ISO_TIME),
        finishedAt: null,
      });

      await post(app, '/stop', { name: 'loop' });
      await run;
      const { body } = await state();
      expect(body.command).toMatchObject({
        status: 'stopped',
        finishedAt: expect.stringMatching(ISO_TIME),
      });
    },
    TIMEOUT,
  );
});
