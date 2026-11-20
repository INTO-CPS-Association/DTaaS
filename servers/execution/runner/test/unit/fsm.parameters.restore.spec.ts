import { describe, expect, it } from '@jest/globals';
import { parseDefinition } from 'src/fsm/definition';
import Parameters from 'src/fsm/parameters';

const { parameters } = parseDefinition(
  `
parameters:
  scope: {type: enum, values: [single, multi], default: single}
  capacity: {type: number, default: 20, controllable: true}
  label: {type: string, default: x}
states:
  create: {}`,
  'state-machine.yaml',
  { commands: ['create'], peers: [] },
);

describe('Restored parameter values', () => {
  it('Should take the stored values that fit their declarations', () => {
    const declared = new Parameters(parameters);

    expect(declared.restore({ scope: 'multi', capacity: 30 })).toEqual([]);
    expect(declared.values()).toEqual({
      scope: 'multi',
      capacity: 30,
      label: 'x',
    });
  });

  it('Should drop the values that no longer fit, which keep their defaults', () => {
    const declared = new Parameters(parameters);

    const dropped = declared.restore({
      removed: 'gone',
      capacity: 'many',
      scope: 'triple',
      label: 'y',
    });

    expect(dropped).toEqual(['removed', 'capacity', 'scope']);
    expect(declared.values()).toEqual({
      scope: 'single',
      capacity: 20,
      label: 'y',
    });
  });
});
