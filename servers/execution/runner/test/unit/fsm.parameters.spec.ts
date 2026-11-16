import { describe, expect, it } from '@jest/globals';
import { parseDefinition } from 'src/fsm/definition';
import Parameters, { variableName } from 'src/fsm/parameters';

const STATES = `
states:
  create: {transitions: {$success: execute}}
  execute:
    transitions:
      restart: create
      scope-changed: {state: execute, stop: true}`;

// The parameters section and the events of a state machine file
const machine = (parameters: string, events = '[restart, scope-changed]') =>
  `events: ${events}\nparameters:\n${parameters}\n${STATES}`;

const EXAMPLE = `
  scope:
    type: enum
    values: [single, multi]
    default: single
    controllable: true
    event: scope-changed
  capacity:
    type: number
    default: 20
  label: {type: string, default: '20', controllable: true, event: restart}
  enabled: {type: boolean, default: true, controllable: true, event: restart}`;

const parse = (text: string) =>
  parseDefinition(text, 'dt.yaml', {
    commands: ['create', 'execute'],
    peers: [],
  });

const parameters = () => new Parameters(parse(machine(EXAMPLE)).parameters);

describe('Parameter declarations', () => {
  it('Should read the declarations of the example', () => {
    const { parameters: declared } = parse(machine(EXAMPLE));

    expect(declared.get('scope')).toEqual({
      type: 'enum',
      values: ['single', 'multi'],
      default: 'single',
      controllable: true,
      event: 'scope-changed',
    });
    expect(declared.get('capacity')).toEqual({
      type: 'number',
      default: 20,
      controllable: false,
    });
  });

  it('Should have no parameters without the section', () => {
    const text = `events: [restart, scope-changed]${STATES}`;

    expect(parse(text).parameters).toEqual(new Map());
  });

  it.each([
    ['a missing default', '  a: {type: string}', 'parameters.a.default'],
    [
      'a default of the wrong type',
      '  a: {type: string, default: 20}',
      'expected string, received number',
    ],
    [
      'a number given as a string',
      '  a: {type: number, default: "20"}',
      'expected number, received string',
    ],
    [
      'an infinite number',
      '  a: {type: number, default: .inf}',
      'expected number, received Infinity',
    ],
    [
      'a number that is not a number',
      '  a: {type: number, default: .nan}',
      'expected number, received NaN',
    ],
    [
      'an enum without values',
      '  a: {type: enum, default: x}',
      'parameters.a.values',
    ],
    [
      'an enum with no values',
      '  a: {type: enum, values: [], default: x}',
      'parameters.a.values',
    ],
    ['an unknown type', '  a: {type: date, default: x}', 'parameters.a.type'],
    ['an unknown key', '  a: {type: string, default: x, unit: m}', 'unit'],
    [
      'a name that is not a name',
      '  -a: {type: string, default: x}',
      'Invalid key in record',
    ],
    [
      'a default outside the values',
      '  a: {type: enum, values: [x, y], default: z}',
      'parameter a default: Invalid option: expected one of "x"|"y"',
    ],
    [
      'an event that is not declared',
      '  a: {type: string, default: x, event: go}',
      'parameter a raises undeclared event go',
    ],
    [
      'two names with one variable',
      '  a-b: {type: string, default: x}\n  A_B: {type: string, default: y}',
      'parameters a-b and A_B share the variable DT_PARAM_A_B',
    ],
    [
      'a __proto__ name',
      '  __proto__: {type: string, default: x}',
      '__proto__ is not a valid name',
    ],
  ])('Should reject %s', (_, section, message) => {
    expect(() => parse(machine(section))).toThrow(message);
  });

  it('Should name the variable of a parameter', () => {
    expect(variableName('max.load-1')).toBe('DT_PARAM_MAX_LOAD_1');
  });
});

describe('Parameters', () => {
  it('Should start at the defaults', () => {
    expect(parameters().values()).toEqual({
      scope: 'single',
      capacity: 20,
      label: '20',
      enabled: true,
    });
  });

  it('Should document the declarations and values without the events', () => {
    const document = parameters().document();

    expect(document.scope).toEqual({
      value: 'single',
      type: 'enum',
      values: ['single', 'multi'],
      default: 'single',
      controllable: true,
    });
    expect(document.capacity).toEqual({
      value: 20,
      type: 'number',
      default: 20,
      controllable: false,
    });
  });

  it('Should list every problem of a body and apply none of it', () => {
    const declared = parameters();

    const result = declared.check({
      scope: 'multi',
      size: 1,
      capacity: 30,
      label: 20,
      enabled: 'yes',
    });

    expect(result).toEqual({
      problems: [
        'parameter size is not declared',
        'parameter capacity is not controllable',
        'parameter label: Invalid input: expected string, received number',
        'parameter enabled: Invalid input: expected boolean, received string',
      ],
    });
    expect(declared.values().scope).toBe('single');
  });

  it('Should refuse a value outside the values of an enum', () => {
    expect(parameters().check({ scope: 'all' })).toEqual({
      problems: [
        'parameter scope: Invalid option: expected one of "single"|"multi"',
      ],
    });
  });

  it('Should return the changes and their events once each in declaration order', () => {
    const result = parameters().check({
      enabled: false,
      label: 'twenty',
      scope: 'multi',
    });

    expect(result).toEqual({
      changes: new Map<string, unknown>([
        ['enabled', false],
        ['label', 'twenty'],
        ['scope', 'multi'],
      ]),
      events: ['scope-changed', 'restart'],
    });
  });

  it('Should leave out a value equal to the current one', () => {
    expect(parameters().check({ scope: 'single', label: '20' })).toEqual({
      changes: new Map(),
      events: [],
    });
  });

  it('Should change nothing for an empty body', () => {
    expect(parameters().check({})).toEqual({ changes: new Map(), events: [] });
  });

  it('Should commit changes without checking them', () => {
    const declared = parameters();

    declared.check({ scope: 'multi' });
    expect(declared.values().scope).toBe('single');
    declared.commit(new Map([['scope', 'multi']]));

    expect(declared.values().scope).toBe('multi');
    expect(declared.document().scope.value).toBe('multi');
  });

  it('Should raise no event for a parameter that declares none', () => {
    const declared = new Parameters(
      parse(machine('  a: {type: number, default: 1, controllable: true}'))
        .parameters,
    );

    expect(declared.check({ a: 2 })).toEqual({
      changes: new Map([['a', 2]]),
      events: [],
    });
  });
});
