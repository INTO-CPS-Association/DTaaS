import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AppModule from 'src/app.module';
import { SIGNAL_BROKER } from 'src/broker/broker';
import Config from 'src/config/config.service';
import PostgresClient from 'src/history/postgres.client';
import { configureSignalsApp } from 'src/main';
import { CapturingLogger, postSignals } from 'test/helpers/e2e';
import FakeBroker from 'test/helpers/fake-broker';
import FakePostgres, { rowsFrom } from 'test/helpers/fake-postgres';
import StubGitLab, { STUB_APPLICATION } from 'test/helpers/stub-gitlab';
import { PUMP, visualisationOf } from 'test/helpers/twins';

export const ALICE_TOKEN = 'alice-oauth-token-0123456789';
export const BOB_TOKEN = 'bob-oauth-token-9876543210';
export const EXPIRED_TOKEN = 'alice-expired-token-0000000000';
export const OTHER_APP_TOKEN = 'alice-other-app-token-1111111111';
export const READ_USER_TOKEN = 'alice-read-user-token-2222222222';
export const CAROL_TOKEN = 'carol-oauth-token-3333333333';
export const FLOW = 'alice/pump/flow';
export const ROOM = 'alice/CTO/room/0224/seat48A/S/S-0001/temperature';
export const VALVE = 'alice/CTO/plant/01/loop1/A/A-0001/position';
export const READER_TOKEN = 'erin-reporter-token-4444444444';
export const GAUGE = 'alice/CTO/plant/01/loop1/A/A-0002/position';
// History is kept per device, so the cross-group paths are device topics.
export const SPEED = 'carol/CTO/room/0101/seat1/S/S-0002/temperature';
export const DAMPER = 'carol/CTO/plant/02/loop1/A/A-0003/position';
export const RANGE = { paths: [ROOM], channel: 'measured', from: 0, to: 1000 };

const ENV_KEYS = [
  'SIGNALS_GITLAB_URL',
  'SIGNALS_GITLAB_CLIENT_ID',
  'SIGNALS_OWNERS_FILE',
];
const ALICE = { id: 1, username: 'alice', email: 'alice@example.org' };

function stubGitLab(): StubGitLab {
  return new StubGitLab(
    {
      [ALICE_TOKEN]: { ...ALICE, projects: [10] },
      [BOB_TOKEN]: {
        id: 2,
        username: 'bob',
        email: 'bob@example.org',
        projects: [],
      },
      [EXPIRED_TOKEN]: { ...ALICE, projects: [10], expiresIn: 0 },
      [OTHER_APP_TOKEN]: { ...ALICE, projects: [10], application: 'other' },
      [READER_TOKEN]: {
        id: 4,
        username: 'erin',
        email: 'erin@example.org',
        projects: [10],
        writable: [],
      },
      [READ_USER_TOKEN]: { ...ALICE, projects: [10], scope: ['read_user'] },
      [CAROL_TOKEN]: {
        id: 3,
        username: 'carol',
        email: 'carol@example.org',
        projects: [11],
      },
    },
    [
      {
        id: 10,
        owner: 'alice',
        sha: 'c0ffee',
        twins: {
          pump: PUMP,
          room: visualisationOf([ROOM]),
          valve: visualisationOf([VALVE], 'setpoint'),
          gauge: visualisationOf([GAUGE]),
        },
      },
      {
        id: 11,
        owner: 'carol',
        sha: 'beef00',
        // The second twin declares a topic of alice's group, which the
        // owners file does not give to carol.
        twins: {
          fan: visualisationOf([SPEED]),
          damper: visualisationOf([DAMPER], 'setpoint'),
          copy: visualisationOf([ROOM]),
          copy_valve: visualisationOf([VALVE], 'setpoint'),
        },
      },
    ],
  );
}

/**
 * The gateway with a stub GitLab, a fake broker and a fake database, started
 * on a free port for the end-to-end tests.
 */
export default class E2eGateway {
  readonly gitlab = stubGitLab();
  readonly broker = new FakeBroker();
  readonly postgres = new FakePostgres(() => rowsFrom(0, 2));
  readonly logger = new CapturingLogger();
  base = '';
  private app?: NestExpressApplication;
  private dir = '';

  async start(): Promise<void> {
    process.env.SIGNALS_GITLAB_URL = await this.gitlab.start();
    process.env.SIGNALS_GITLAB_CLIENT_ID = STUB_APPLICATION;
    this.dir = await mkdtemp(path.join(os.tmpdir(), 'signals-e2e-'));
    const owners = path.join(this.dir, 'owners.json');
    await writeFile(
      owners,
      JSON.stringify({
        alice: { group: 'alice', topics: ['alice/'] },
        carol: { group: 'carol', topics: ['carol/'] },
      }),
    );
    process.env.SIGNALS_OWNERS_FILE = owners;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SIGNAL_BROKER)
      .useValue(this.broker)
      .overrideProvider(PostgresClient)
      .useValue(this.postgres.asClient())
      .compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    app.useLogger(this.logger);
    configureSignalsApp(app, moduleRef.get(Config));
    await app.listen(0, '127.0.0.1');
    this.base = await app.getUrl();
    this.app = app;
  }

  async stop(): Promise<void> {
    await this.app?.close();
    await this.gitlab.stop();
    ENV_KEYS.forEach((key) => delete process.env[key]);
    await rm(this.dir, { recursive: true, force: true });
  }

  post(route: string, token: string | undefined, body: unknown) {
    return postSignals(this.base, route, token, body);
  }
}
