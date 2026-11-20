import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { loadDefinition, parseDefinition } from 'src/fsm/definition';

const known = { commands: ['create', 'execute', 'terminate'], peers: [] };

const FILE = 'dt.yaml';

const valid = `
events: [start, stop]
states:
  create:
    transitions:
      $success: execute
      $failure: terminate
  execute:
    transitions:
      stop: terminate
  terminate:
`;

const expectInvalid = (text: string, message: string) =>
  expect(() => parseDefinition(text, FILE, known)).toThrow(message);

describe('State machine definition', () => {
  it('Should read the events and the transitions of each state', () => {
    const definition = parseDefinition(valid, FILE, known);

    expect([...definition.events]).toEqual(['start', 'stop']);
    expect([...definition.states.keys()]).toEqual(known.commands);
    expect(definition.states.get('create')).toEqual(
      new Map([
        ['$success', { state: 'execute', stop: false }],
        ['$failure', { state: 'terminate', stop: false }],
      ]),
    );
    expect(definition.states.get('terminate')).toEqual(new Map());
  });

  it('Should accept a state with an empty transition map', () => {
    const definition = parseDefinition(
      'states: {create: {transitions: }}',
      FILE,
      known,
    );

    expect(definition.states.get('create')).toEqual(new Map());
  });

  it('Should accept a file without events', () => {
    const definition = parseDefinition('states: {create: {}}', FILE, known);

    expect(definition.events.size).toBe(0);
  });

  it('Should refuse a file that is not YAML', () => {
    expectInvalid('states: [', 'Invalid state machine');
    expectInvalid('create', 'Invalid state machine');
  });

  it('Should refuse unknown keys', () => {
    expectInvalid('states: {create: {}}\ninitial: create', 'initial');
    expectInvalid('states: {create: {after: execute}}', 'after');
  });

  it('Should refuse a file without states', () => {
    expectInvalid('events: [start]', 'states');
    expectInvalid('states: {}', 'at least one state');
  });

  it.each([
    ['a path', '../create'],
    ['a leading underscore', '__proto__'],
    ['a dollar sign', '$start'],
    ['a long name', 'a'.repeat(65)],
  ])('Should refuse a name with %s', (_, name) => {
    expectInvalid(`events: ['${name}']\nstates: {create: {}}`, 'events');
  });

  it.each([
    ['a state', 'states: {__proto__: {}, create: {}}'],
    ['an event', 'states: {create: {transitions: {__proto__: create}}}'],
  ])('Should refuse __proto__ as %s', (_, text) => {
    expectInvalid(text, '__proto__');
  });

  it('Should refuse two transitions for one event', () => {
    expectInvalid(
      'events: [go]\nstates: {create: {transitions: {go: create, go: create}}}',
      'duplicated mapping key',
    );
  });

  it('Should refuse a state that is not a permitted command', () => {
    expectInvalid('states: {configure: {}}', 'configure');
  });

  it('Should refuse a transition to an undeclared state', () => {
    expectInvalid(
      'events: [start]\nstates: {create: {transitions: {start: execute}}}',
      'execute',
    );
  });

  it('Should refuse a transition on an undeclared event', () => {
    expectInvalid('states: {create: {transitions: {start: create}}}', 'start');
  });

  it('Should refuse a cycle of completion transitions', () => {
    const cycle = `
states:
  create: {transitions: {$success: execute}}
  execute: {transitions: {$failure: create}}`;
    expectInvalid(cycle, 'create -> execute -> create');
  });

  it('Should refuse a completion transition to the same state', () => {
    expectInvalid(
      'states: {create: {transitions: {$success: create}}}',
      'create -> create',
    );
  });

  it('Should read a transition that stops the script', () => {
    const definition = parseDefinition(
      `
events: [restart]
states: {execute: {transitions: {restart: {state: execute, stop: true}}}}`,
      FILE,
      known,
    );

    expect(definition.states.get('execute')?.get('restart')).toEqual({
      state: 'execute',
      stop: true,
    });
  });

  it.each([
    ['stop: false', '{state: create, stop: false}', 'stop: true'],
    ['no stop', '{state: create}', 'stop: true'],
    ['an unknown key', '{state: create, stop: true, after: 5}', 'after'],
    ['an undeclared state', '{state: configure, stop: true}', 'configure'],
  ])('Should refuse a transition object with %s', (_, value, message) => {
    expectInvalid(
      `events: [go]\nstates: {create: {transitions: {go: ${value}}}}`,
      message,
    );
  });

  it.each(['$success', '$failure', '$stopped'])(
    'Should refuse to stop the script on %s',
    (event) => {
      expectInvalid(
        `states: {create: {transitions: {${event}: {state: create, stop: true}}}}`,
        `state create can not stop its script on ${event}`,
      );
    },
  );

  it('Should allow a loop through $stopped', () => {
    const loop = `
states:
  create: {transitions: {$stopped: execute}}
  execute: {transitions: {$success: create, $stopped: execute}}`;
    expect(() => parseDefinition(loop, FILE, known)).not.toThrow();
  });

  it('Should allow a cycle that waits for an event', () => {
    const loop = `
events: [reset]
states:
  create: {transitions: {$success: execute}}
  execute: {transitions: {reset: create}}`;
    expect(() => parseDefinition(loop, FILE, known)).not.toThrow();
  });
});

describe('State machine file', () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Should read the file it is given', () => {
    dir = mkdtempSync(join(tmpdir(), 'fsm-'));
    writeFileSync(join(dir, FILE), valid);

    expect(loadDefinition(join(dir, FILE), known)?.states.size).toBe(3);
  });

  it('Should read the state machine of the test scripts', () => {
    const definition = loadDefinition('test/data/scripts/state-machine.yaml', {
      commands: ['create', 'execute'],
      peers: ['hospital-2'],
    });

    expect([...(definition?.states.keys() ?? [])]).toEqual([
      'create',
      'execute',
    ]);
    expect(definition?.parameters.get('fidelity')).toEqual({
      type: 'enum',
      values: ['low', 'medium', 'high'],
      default: 'medium',
      controllable: true,
      event: 'fidelity-changed',
    });
    const restart = definition?.states.get('execute')?.get('fidelity-changed');
    expect(restart).toEqual({ state: 'execute', stop: true });
  });

  it('Should have no state machine without a file', () => {
    expect(loadDefinition(undefined, known)).toBeUndefined();
  });

  it('Should name a file that does not exist', () => {
    dir = mkdtempSync(join(tmpdir(), 'fsm-'));
    const file = join(dir, FILE);

    expect(() => loadDefinition(file, known)).toThrow(
      `State machine file ${file} does not exist or is not a file`,
    );
  });

  it('Should refuse a directory as the file', () => {
    dir = mkdtempSync(join(tmpdir(), 'fsm-'));

    expect(() => loadDefinition(dir, known)).toThrow(
      `State machine file ${dir} does not exist or is not a file`,
    );
  });

  it('Should name the file in the errors of its definition', () => {
    dir = mkdtempSync(join(tmpdir(), 'fsm-'));
    const file = join(dir, FILE);
    writeFileSync(file, 'states: {configure: {}}');

    expect(() => loadDefinition(file, known)).toThrow(
      `Invalid state machine in ${file}:`,
    );
  });
});
