import { describe, expect, it } from '@jest/globals';
import { parseDefinition } from 'src/fsm/definition';

const known = { commands: ['monitor', 'idle'], peers: [] };

const parse = (text: string) => parseDefinition(text, 'dt.yaml', known);

const separated = { ...known, separated: true };

const expectInvalid = (text: string, message: string) =>
  expect(() => parse(text)).toThrow(message);

const withEnv = (env: string) => `env: ${env}\nstates: {idle: }`;

describe('Declared environment of the state machine file', () => {
  it('Should read the env of the file and of each state as strings', () => {
    const definition = parse(`
parameters:
  scope: {type: string, default: single}
env:
  LOG_LEVEL: info
  HINT: '\${DT_ID}-\${DT_PARAM_SCOPE}'
states:
  monitor:
    env:
      INTERVAL: 5
      VERBOSE: true
      URL: '\${RUNNER_URL}/fsm'
      ENTRY: '\${DT_STATE}#\${DT_ENTRY}'
    transitions:
      $success: idle
  idle:`);

    expect(definition.env).toEqual({
      LOG_LEVEL: 'info',
      HINT: '${DT_ID}-${DT_PARAM_SCOPE}',
    });
    expect(definition.stateEnv.get('monitor')).toEqual({
      INTERVAL: '5',
      VERBOSE: 'true',
      URL: '${RUNNER_URL}/fsm',
      ENTRY: '${DT_STATE}#${DT_ENTRY}',
    });
    expect(definition.stateEnv.get('idle')).toEqual({});
  });

  it('Should have no env when the file declares none', () => {
    const definition = parse('states: {idle: {transitions: }}');

    expect(definition.env).toEqual({});
    expect(definition.stateEnv.get('idle')).toEqual({});
  });

  it('Should refuse a name that is not upper case', () => {
    expectInvalid(
      withEnv('{log_level: info}'),
      'must be upper-case letters, digits or _, from a letter',
    );
  });

  it.each(['DT_LEVEL', 'RUNNER_HOST'])('Should refuse the name %s', (name) => {
    expectInvalid(
      withEnv(`{${name}: x}`),
      'must not start with DT_ or RUNNER_',
    );
  });

  it.each(['{LEVEL: {a: b}}', '{LEVEL: [a]}', '{LEVEL: }', '{LEVEL: .inf}'])(
    'Should refuse the value of %s',
    (env) => {
      expectInvalid(withEnv(env), 'Invalid state machine in dt.yaml');
    },
  );

  it('Should refuse a reference to another declared variable', () => {
    expectInvalid(
      `env: {A: a, B: '\${A}'}\nstates: {idle: }`,
      'env B uses unknown variable A',
    );
  });

  it('Should refuse a reference to a process variable in a state', () => {
    expectInvalid(
      `states: {idle: {env: {WHERE: '\${HOME}/dt'}}}`,
      'state idle env WHERE uses unknown variable HOME',
    );
  });

  it('Should refuse a parameter variable of no declared parameter', () => {
    expectInvalid(
      withEnv(`{HINT: '\${DT_PARAM_SCOPE}'}`),
      'env HINT uses unknown variable DT_PARAM_SCOPE',
    );
  });

  it.each([
    ['the file', 'env: {__proto__: {}}\nstates: {idle: }'],
    ['a state', 'states: {idle: {env: {__proto__: {}}}}'],
  ])('Should refuse a __proto__ key in the env of %s', (_where, text) => {
    expectInvalid(text, '__proto__ is not a valid name');
  });

  it.each(['LD_PRELOAD', 'MALLOC_CHECK_', 'GCONV_PATH', 'LANG', 'LC_ALL'])(
    'Should refuse %s in the env of the file with scripts.user',
    (name) => {
      expect(() =>
        parseDefinition(withEnv(`{${name}: x}`), 'dt.yaml', separated),
      ).toThrow(`env ${name} is refused with scripts.user`);
    },
  );

  it('Should refuse a loader name in the env of a state with scripts.user', () => {
    expect(() =>
      parseDefinition(
        'states: {idle: {env: {LD_AUDIT: /var/lib/dt/run/a.so}}}',
        'dt.yaml',
        separated,
      ),
    ).toThrow('state idle env LD_AUDIT is refused with scripts.user');
  });

  it.each(['PATH', 'POLL_MS'])(
    'Should take %s in the env with scripts.user',
    (name) => {
      const text = `env: {${name}: x}
states: {idle: {env: {${name}: y}}}`;

      expect(parseDefinition(text, 'dt.yaml', separated).env).toEqual({
        [name]: 'x',
      });
    },
  );

  it.each(['LD_PRELOAD', 'MALLOC_CHECK_', 'GCONV_PATH', 'LANG', 'LC_ALL'])(
    'Should take %s in the env without scripts.user',
    (name) => {
      expect(parse(withEnv(`{${name}: x}`)).env).toEqual({ [name]: 'x' });
    },
  );
});
