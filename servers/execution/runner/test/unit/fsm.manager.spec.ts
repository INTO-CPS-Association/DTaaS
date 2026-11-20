import { describe, expect, it } from '@jest/globals';
import { parseDefinition } from 'src/fsm/definition';

const known = { commands: ['create', 'execute', 'admit'], peers: [] };

const FILE = 'dt.yaml';

const STATES = 'states:\n  create:\n';

const parse = (text: string) => parseDefinition(text, FILE, known);

describe('Commands a Manager may submit', () => {
  it('Should read the commands of the manager section', () => {
    const definition = parse(`${STATES}manager:\n  commands:\n    - admit\n`);

    expect(definition.managerCommands).toEqual(['admit']);
  });

  it('Should have no commands without a manager section', () => {
    expect(parse(STATES).managerCommands).toEqual([]);
  });

  it('Should have no commands for a bare manager key', () => {
    expect(parse(`${STATES}manager:\n`).managerCommands).toEqual([]);
  });

  it('Should have no commands for a manager section without a list', () => {
    expect(parse(`${STATES}manager:\n  commands:\n`).managerCommands).toEqual(
      [],
    );
  });

  it('Should refuse a command that is not permitted, naming the file', () => {
    expect(() =>
      parse(`${STATES}manager:\n  commands:\n    - discharge\n`),
    ).toThrow(
      /dt\.yaml[\s\S]*manager command discharge is not a permitted command/,
    );
  });

  it('Should refuse an unknown key of the manager section', () => {
    expect(() => parse(`${STATES}manager:\n  roles: []\n`)).toThrow(
      /Invalid state machine in dt\.yaml/,
    );
  });
});
