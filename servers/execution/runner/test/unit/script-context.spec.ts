import type { Server } from 'node:http';
import { describe, expect, it } from '@jest/globals';
import { parseDefinition } from 'src/fsm/definition';
import Parameters from 'src/fsm/parameters';
import {
  RunnerContext,
  runnerUrl,
  scriptEnvironment,
} from 'src/fsm/script-context';

const definition = parseDefinition(
  `
parameters:
  scope: {type: string, default: single}
env:
  HINT: '\${DT_ID}-\${DT_PARAM_SCOPE}'
  WHERE: '\${RUNNER_URL}/fsm'
  LEVEL: file
states:
  monitor:
    env:
      LEVEL: state
      INTERVAL: 5
      ENTRY: '\${DT_STATE}#\${DT_ENTRY}'
  idle:`,
  'dt.yaml',
  { commands: ['monitor', 'idle'], peers: [] },
);

const machine = {
  id: 'dt-1',
  url: 'http://127.0.0.1:5000',
  state: 'monitor',
  entry: 2,
  values: { scope: 'multi' },
  definition,
  inherited: {},
};

describe('Script environment', () => {
  it('Should give only the identity and address without a machine', () => {
    expect(
      scriptEnvironment({
        id: 'dt-1',
        url: 'http://h:1',
        command: 'x',
        inherited: {},
      }),
    ).toEqual({ RUNNER_URL: 'http://h:1', DT_ID: 'dt-1' });
  });

  it('Should give the script token with access control', () => {
    const env = scriptEnvironment({
      id: 'dt-1',
      url: 'http://h:1',
      token: 'token-1',
      command: 'x',
      inherited: { RUNNER_TOKEN: 'inherited' },
    });

    expect(env.RUNNER_TOKEN).toBe('token-1');
  });

  it('Should leave RUNNER_URL unset, and empty where it is interpolated', () => {
    const env = scriptEnvironment({
      ...machine,
      url: undefined,
      command: 'idle',
    });

    expect(env).not.toHaveProperty('RUNNER_URL');
    expect(env).not.toHaveProperty('RUNNER_TOKEN');
    expect(env.WHERE).toBe('/fsm');
  });

  it('Should give an empty state and entry 0 before the first transition', () => {
    const env = scriptEnvironment({
      ...machine,
      state: undefined,
      entry: 0,
      command: 'idle',
    });

    expect(env).toMatchObject({ DT_STATE: '', DT_ENTRY: '0' });
  });

  it('Should add the parameters and the file env, interpolated', () => {
    expect(scriptEnvironment({ ...machine, command: 'idle' })).toEqual({
      RUNNER_URL: 'http://127.0.0.1:5000',
      DT_ID: 'dt-1',
      DT_STATE: 'monitor',
      DT_ENTRY: '2',
      DT_PARAM_SCOPE: 'multi',
      HINT: 'dt-1-multi',
      WHERE: 'http://127.0.0.1:5000/fsm',
      LEVEL: 'file',
    });
  });

  it("Should add the env of the command's state over the file env", () => {
    expect(scriptEnvironment({ ...machine, command: 'monitor' })).toMatchObject(
      {
        LEVEL: 'state',
        INTERVAL: '5',
        ENTRY: 'monitor#2',
      },
    );
  });

  it('Should let runner and declared variables replace inherited ones', () => {
    const env = scriptEnvironment({
      ...machine,
      command: 'idle',
      inherited: { DT_ID: 'outer', LEVEL: 'outer', HOME: '/home/dt' },
      platform: 'linux',
    });

    expect(env).toMatchObject({
      DT_ID: 'dt-1',
      LEVEL: 'file',
      HOME: '/home/dt',
    });
  });

  it('Should keep inherited names in another case on Linux', () => {
    const env = scriptEnvironment({
      ...machine,
      command: 'idle',
      inherited: { dt_id: 'outer', Path: '/bin', UNSET: undefined },
      platform: 'linux',
    });

    expect(env).toMatchObject({ dt_id: 'outer', Path: '/bin' });
    expect(env).not.toHaveProperty('UNSET');
  });

  it('Should drop inherited names that match in another case on Windows', () => {
    const env = scriptEnvironment({
      ...machine,
      definition: parseDefinition(
        'env: {PATH: C:\\dt}\nstates: {idle: }',
        'dt.yaml',
        { commands: ['idle'], peers: [] },
      ),
      command: 'idle',
      inherited: { dt_id: 'outer', Path: 'C:\\Windows', SystemRoot: 'C:\\' },
      platform: 'win32',
    });

    expect(env).not.toHaveProperty('dt_id');
    expect(env).not.toHaveProperty('Path');
    expect(env).toMatchObject({
      DT_ID: 'dt-1',
      PATH: 'C:\\dt',
      SystemRoot: 'C:\\',
    });
  });

  it('Should inherit the environment of the runner by default', () => {
    const env = scriptEnvironment({ id: 'dt-1', command: 'x' });

    expect(Object.keys(env).length).toBeGreaterThan(1);
  });
});

describe('Runner URL', () => {
  const server = (address: ReturnType<Server['address']>) => ({
    address: () => address,
  });

  it('Should point at the loopback address and the port', () => {
    expect(
      runnerUrl(server({ address: '::', family: 'IPv6', port: 5001 })),
    ).toBe('http://127.0.0.1:5001');
  });

  it('Should have none before the server listens, or on a pipe', () => {
    expect(runnerUrl(server(null))).toBeUndefined();
    expect(runnerUrl(server('\\\\.\\pipe\\runner'))).toBeUndefined();
  });
});

describe('Runner context', () => {
  it('Should start with no identity, address or machine', () => {
    expect(new RunnerContext().environment('x')).toMatchObject({ DT_ID: '' });
  });

  it('Should build the environment from what it holds', () => {
    const context = new RunnerContext();
    context.load('dt-1', definition, new Parameters(definition.parameters));
    context.setApi('http://127.0.0.1:5000', 'token-1');

    expect(context.environment('monitor', 'monitor', 1)).toMatchObject({
      RUNNER_URL: 'http://127.0.0.1:5000',
      RUNNER_TOKEN: 'token-1',
      DT_STATE: 'monitor',
      DT_ENTRY: '1',
      DT_PARAM_SCOPE: 'single',
      LEVEL: 'state',
    });
  });
});
