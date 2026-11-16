import { describe, expect, it } from '@jest/globals';
import { parseDefinition } from 'src/fsm/definition';

const known = { commands: ['open', 'full'], peers: ['hospital-2'] };

const FILE = 'dt.yaml';

const HEAD = `
events: [neighbour-full, neighbour-down]
states:
  open:
    transitions:
      neighbour-full:
        state: open
        stop: true
  full:
`;

const EXAMPLE = `${HEAD}subscriptions:
  - peer: hospital-2
    when:
      state: full
    event: neighbour-full
  - peer: hospital-2
    when:
      online: false
    event: neighbour-down
`;

const parse = (text: string) => parseDefinition(text, FILE, known);

// The file with one subscription, whose lines follow the dash
const withEntry = (entry: string) => `${HEAD}subscriptions:\n  - ${entry}\n`;

const expectInvalid = (text: string, message: string | RegExp) =>
  expect(() => parse(text)).toThrow(message);

describe('Subscriptions of the state machine file', () => {
  it('Should read the subscriptions in file order', () => {
    expect(parse(EXAMPLE).subscriptions).toEqual([
      { peer: 'hospital-2', when: { state: 'full' }, event: 'neighbour-full' },
      { peer: 'hospital-2', when: { online: false }, event: 'neighbour-down' },
    ]);
  });

  it('Should accept a file without the section, or with an empty list', () => {
    expect(parse(HEAD).subscriptions).toEqual([]);
    expect(parse(`${HEAD}subscriptions: []\n`).subscriptions).toEqual([]);
  });

  it('Should accept one condition with two events', () => {
    const text = `${EXAMPLE}  - peer: hospital-2
    when:
      state: full
    event: neighbour-down
`;

    expect(parse(text).subscriptions.map(({ event }) => event)).toEqual([
      'neighbour-full',
      'neighbour-down',
      'neighbour-down',
    ]);
  });

  it('Should refuse an unknown key, or a missing one, of an entry', () => {
    expectInvalid(
      withEntry(
        'peer: hospital-2\n    when: {online: true}\n    event: neighbour-down\n    on: state',
      ),
      /Unrecognized key: "on"[\s\S]*subscriptions\[0\]/,
    );
    expectInvalid(
      withEntry('peer: hospital-2\n    when: {online: true}'),
      /subscriptions\[0\]\.event/,
    );
  });

  it('Should refuse __proto__ in an entry or in its when', () => {
    expectInvalid(
      withEntry(
        'peer: hospital-2\n    when: {online: true}\n    event: neighbour-down\n    __proto__: {}',
      ),
      /Unrecognized key: "__proto__"[\s\S]*subscriptions\[0\]/,
    );
    expectInvalid(
      withEntry(
        'peer: hospital-2\n    when: {online: true, __proto__: {}}\n    event: neighbour-down',
      ),
      /Unrecognized key: "__proto__"[\s\S]*subscriptions\[0\]\.when/,
    );
  });

  it('Should refuse a when with no key, both keys or another key', () => {
    ['{}', '{state: full, online: true}', '{descriptor: x}'].forEach((when) =>
      expectInvalid(
        withEntry(
          `peer: hospital-2\n    when: ${when}\n    event: neighbour-down`,
        ),
        'must hold exactly one of state: <name> and online: <boolean>',
      ),
    );
  });

  it('Should refuse an online that is not a boolean, and a bad state name', () => {
    const entry = (when: string) =>
      withEntry(
        `peer: hospital-2\n    when: ${when}\n    event: neighbour-down`,
      );

    expectInvalid(
      entry('{online: yes please}'),
      /must hold exactly one of state[\s\S]*subscriptions\[0\]\.when/,
    );
    expectInvalid(
      entry("{state: 'no/state'}"),
      /must be up to 64 letters[\s\S]*subscriptions\[0\]\.when\.state/,
    );
  });

  it('Should refuse an unlisted peer and an undeclared event, naming each', () => {
    const text = withEntry(
      'peer: hospital-3\n    when: {state: full}\n    event: neighbour-gone',
    );

    expectInvalid(text, 'subscription to unlisted peer hospital-3');
    expectInvalid(
      text,
      'subscription to peer hospital-3 raises undeclared event neighbour-gone',
    );
  });

  it('Should refuse a completion event, as the name pattern has no $', () => {
    expectInvalid(
      withEntry(
        'peer: hospital-2\n    when: {state: full}\n    event: $failure',
      ),
      /subscriptions\[0\]\.event/,
    );
  });

  it('Should refuse a duplicate entry', () => {
    const text = `${EXAMPLE}  - peer: hospital-2
    when:
      online: false
    event: neighbour-down
`;

    expectInvalid(
      text,
      'subscription to peer hospital-2 repeats neighbour-down on online false',
    );
  });
});
