import { describe, expect, it } from '@jest/globals';
import { ScriptStatus } from 'src/dto/fsm.dto';
import { parseDefinition } from 'src/fsm/definition';
import recover from 'src/fsm/recovery';

const definition = parseDefinition(
  `
states:
  create: {transitions: {$success: execute}}
  execute: {}`,
  'state-machine.yaml',
  { commands: ['create', 'execute'], peers: [] },
);

const UNSTARTED = { state: undefined, entry: 0, status: 'none' } as const;

describe('Recovery of a stored machine', () => {
  it('Should start unstarted without a stored machine', () => {
    expect(recover(definition)).toEqual(UNSTARTED);
  });

  it('Should keep the entry counter of an unstarted machine', () => {
    expect(recover(definition, { ...UNSTARTED, entry: 4 })).toEqual({
      ...UNSTARTED,
      entry: 4,
    });
  });

  it('Should start unstarted with a warning for an unknown state', () => {
    const recovered = recover(definition, {
      state: 'configure',
      entry: 5,
      status: 'valid',
    });

    expect(recovered).toMatchObject({ ...UNSTARTED, entry: 5 });
    expect(recovered.warning).toContain('configure');
  });

  it('Should interrupt a script that was running', () => {
    expect(
      recover(definition, { state: 'execute', entry: 3, status: 'running' }),
    ).toEqual({ state: 'execute', entry: 3, status: 'interrupted' });
  });

  it.each<ScriptStatus>(['valid', 'invalid', 'stopped', 'interrupted'])(
    'Should keep the state, entry and status %s',
    (status) => {
      expect(
        recover(definition, { state: 'create', entry: 2, status }),
      ).toEqual({ state: 'create', entry: 2, status });
    },
  );
});
