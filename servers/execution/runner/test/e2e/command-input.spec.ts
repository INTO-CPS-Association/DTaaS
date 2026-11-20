import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { MAX_INPUT_BYTES } from 'src/dto/command.dto';
import { MEASURED } from 'test/utils';
import { digitalTwin, poll, post, startRunner } from './fsm.util';

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

const INPUT = { patient: 'p-17', ward: 'B' };

describe('POST / with input and outcome', () => {
  let dir: string;
  let app: INestApplication;

  beforeEach(async () => {
    dir = digitalTwin(undefined, ['echo-input', 'fail', 'loop']);
    app = await startRunner(join(dir, 'runner.yaml'));
  }, TIMEOUT);

  afterEach(async () => {
    await post(app, '/stop', {});
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }, TIMEOUT);

  it(
    'Should pass the input to the script and answer its result',
    async () => {
      const { status, body } = await post(app, '/', {
        name: 'echo-input',
        input: INPUT,
      });

      expect(status).toBe(HttpStatus.OK);
      expect(body).toMatchObject({
        status: 'success',
        result: { exitCode: 0, stderr: '' },
      });
      expect(JSON.parse(body.result.stdout)).toEqual(INPUT);
    },
    TIMEOUT,
  );

  it(
    'Should answer a failing script with its result and keep its status',
    async () => {
      const { status, body } = await post(app, '/', { name: 'fail' });
      const latest = await supertest(app.getHttpServer()).get('/');
      const state = await supertest(app.getHttpServer()).get('/state');

      expect([status, body]).toEqual([
        HttpStatus.OK,
        {
          status: 'failed',
          result: {
            exitCode: 3,
            stdout: '',
            stderr: 'no free bed',
            resources: MEASURED,
          },
        },
      ]);
      expect(latest.body).toEqual(
        expect.objectContaining({ exitCode: 3, resources: MEASURED }),
      );
      expect(state.body.command).toMatchObject({ status: 'failed' });
    },
    TIMEOUT,
  );

  it(
    'Should refuse input for a running command with 409',
    async () => {
      // supertest sends a request only when then is called on it, as
      // await does; this starts the long run before the poll waits
      const running = post(app, '/', { name: 'loop' }).then((reply) => reply);
      await poll(app, '/', (latest) => latest.name === 'loop');

      const refused = await post(app, '/', { name: 'loop', input: INPUT });
      await post(app, '/stop', { name: 'loop' });

      expect([refused.status, refused.body]).toEqual([
        HttpStatus.CONFLICT,
        { status: 'command running' },
      ]);
      expect((await running).body).toMatchObject({ status: 'stopped' });
    },
    TIMEOUT,
  );

  it('Should refuse an input over the limit as invalid', async () => {
    const input = { text: 'x'.repeat(MAX_INPUT_BYTES) };

    const { status, body } = await post(app, '/', { name: 'fail', input });

    expect([status, body.message]).toEqual([
      HttpStatus.BAD_REQUEST,
      'Validation Failed',
    ]);
  });

  it('Should refuse a body over the limit of the JSON parser', async () => {
    const input = { text: 'x'.repeat(100 * 1024) };

    const { status } = await post(app, '/', { name: 'fail', input });

    expect(status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
  });
});
