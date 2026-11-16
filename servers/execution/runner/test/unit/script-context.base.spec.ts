import { describe, expect, it } from '@jest/globals';
import { parseDefinition } from 'src/fsm/definition';
import { RunnerContext } from 'src/fsm/script-context';
import { scriptBase } from 'src/scripts/launch';
import { ACCOUNT } from './scripts.fake-fs';

const definition = parseDefinition(
  `
env:
  LEVEL: file
  PATH: /opt/dt/bin:/usr/bin
states:
  monitor:
    env:
      LEVEL: state
  idle:`,
  'dt.yaml',
  { commands: ['monitor', 'idle'], peers: [] },
);

const user = { account: ACCOUNT, runDirectory: '/var/lib/dt/run' };

const runner = {
  HOME: '/home/runner',
  USER: 'dt-runner',
  PATH: '/opt/node/bin:/usr/bin',
  TMPDIR: '/var/tmp',
  LANG: 'C.UTF-8',
  MQTT_PASSWORD: 'secret',
};

// A context of the definition with the base of the account, if any
function context(base?: Record<string, string | undefined>) {
  const result = new RunnerContext();
  result.load('dt-1', definition);
  result.setApi('http://127.0.0.1:5000', 'token-1');
  if (base !== undefined) {
    result.inherit(base);
  }
  return result;
}

describe('Base of the script environment', () => {
  it('Should build on the allow-list of a script account', () => {
    expect(context(scriptBase(user, runner)).environment('idle')).toEqual({
      HOME: '/nonexistent',
      USER: 'dt-script',
      LOGNAME: 'dt-script',
      PATH: '/opt/dt/bin:/usr/bin',
      TMPDIR: '/var/tmp',
      LANG: 'C.UTF-8',
      RUNNER_URL: 'http://127.0.0.1:5000',
      RUNNER_TOKEN: 'token-1',
      DT_ID: 'dt-1',
      LEVEL: 'file',
    });
  });

  it("Should let the state's env win over the file's and the base", () => {
    const env = context(scriptBase(user, runner)).environment('monitor');

    expect(env.LEVEL).toBe('state');
    expect(env).not.toHaveProperty('MQTT_PASSWORD');
  });

  it("Should build on the runner's environment without an account", () => {
    const env = context(scriptBase(undefined, runner)).environment('idle');

    expect(env).toMatchObject({
      HOME: '/home/runner',
      MQTT_PASSWORD: 'secret',
    });
  });

  it("Should build on the process's environment without a base", () => {
    expect(context().environment('idle').JEST_WORKER_ID).toBe(
      process.env.JEST_WORKER_ID,
    );
  });
});
