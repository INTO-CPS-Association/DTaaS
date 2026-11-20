import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
  createService,
  MACHINE_FILE,
  scriptFolder,
  settle,
} from './fsm.fixture';

const DEFINITION = `
events: [halt]
parameters:
  scope: {type: string, default: single}
env:
  HINT: '\${DT_ID}-\${DT_PARAM_SCOPE}'
states:
  create:
    env: {LEVEL: create}
    transitions:
      halt: {state: terminate, stop: true}
  execute:
  terminate:
    env: {LEVEL: terminate}`;

describe('State machine service environment of scripts', () => {
  let dir: string;

  beforeAll(() => {
    dir = scriptFolder(DEFINITION);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const setup = () => createService(join(dir, MACHINE_FILE));

  // The env that the service passed with the last script it started
  const lastEnv = (calls: unknown[][]) =>
    (calls.at(-1)?.[2] as { env: Record<string, string> }).env;

  it('Should pass the environment of the entry it starts', () => {
    const { service, manager } = setup();
    service.setRunnerApi('http://127.0.0.1:5000', 'token-1');

    service.transition('create');

    expect(lastEnv(manager.newCommand.mock.calls)).toMatchObject({
      RUNNER_URL: 'http://127.0.0.1:5000',
      RUNNER_TOKEN: 'token-1',
      DT_ID: 'dt-1',
      DT_STATE: 'create',
      DT_ENTRY: '1',
      DT_PARAM_SCOPE: 'single',
      HINT: 'dt-1-single',
      LEVEL: 'create',
    });
  });

  it('Should pass the target and its entry on a stop transition', async () => {
    const { service, manager } = setup();
    service.transition('create');

    service.event('halt');
    await settle();

    expect(lastEnv(manager.newCommand.mock.calls)).toMatchObject({
      DT_STATE: 'terminate',
      DT_ENTRY: '2',
      LEVEL: 'terminate',
    });
  });

  it('Should take parameter values as they are when the script starts', () => {
    const { service, manager } = setup();
    service.parameters()?.commit(new Map([['scope', 'multi']]));

    service.transition('execute');

    expect(lastEnv(manager.newCommand.mock.calls)).toMatchObject({
      DT_PARAM_SCOPE: 'multi',
      HINT: 'dt-1-multi',
    });
  });

  it('Should describe the machine as it is for POST /', () => {
    const { service } = setup();
    expect(service.environment('terminate')).toMatchObject({
      DT_STATE: '',
      DT_ENTRY: '0',
      LEVEL: 'terminate',
    });

    service.transition('execute');

    expect(service.environment('create')).toMatchObject({
      DT_STATE: 'execute',
      DT_ENTRY: '1',
      LEVEL: 'create',
    });
  });

  it('Should leave RUNNER_URL unset until the server listens', () => {
    const { service } = setup();
    service.setRunnerApi(undefined, undefined);

    const env = service.environment('create');
    expect(env).not.toHaveProperty('RUNNER_URL');
    expect(env).not.toHaveProperty('RUNNER_TOKEN');
  });

  it('Should start from the allow-list with a script account', () => {
    const account = {
      name: 'dt-script',
      uid: 999,
      gid: 986,
      home: '/nonexistent',
      groups: [986],
    };
    const user = { account, runDirectory: '/var/lib/dt/run' };
    const { service } = createService(join(dir, MACHINE_FILE), user);
    service.setRunnerApi('http://127.0.0.1:5000', 'token-1');

    const env = service.environment('create');

    expect(env).toMatchObject({
      HOME: '/nonexistent',
      USER: 'dt-script',
      LOGNAME: 'dt-script',
      PATH: '/usr/local/bin:/bin:/usr/bin',
      RUNNER_TOKEN: 'token-1',
      HINT: 'dt-1-single',
      LEVEL: 'create',
    });
    // Jest sets JEST_WORKER_ID in the runner's own environment
    expect(env).not.toHaveProperty('JEST_WORKER_ID');
  });

  it("Should keep the runner's environment without a script account", () => {
    const { service } = setup();

    expect(service.environment('create').JEST_WORKER_ID).toBe(
      process.env.JEST_WORKER_ID,
    );
  });

  it('Should give only the identity without a state machine', () => {
    const { service } = createService(undefined);

    const env = service.environment('create');

    expect(env.DT_ID).toBe('dt-1');
    expect(env).not.toHaveProperty('DT_STATE');
    expect(env).not.toHaveProperty('DT_ENTRY');
  });
});
