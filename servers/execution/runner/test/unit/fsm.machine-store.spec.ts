import { describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { StoredMachine } from 'src/dto/fsm.dto';
import { ParameterValue } from 'src/dto/parameters.dto';
import { parseDefinition } from 'src/fsm/definition';
import MachineStore from 'src/fsm/machine-store';
import Parameters from 'src/fsm/parameters';
import Queue from 'src/queue.service';

const definition = parseDefinition(
  `
parameters:
  scope: {type: enum, values: [single, multi], default: single}
states:
  create: {}
  execute: {}`,
  'state-machine.yaml',
  { commands: ['create', 'execute'], peers: [] },
);

// A queue with the stored row and parameter values given
function fakeQueue(
  stored?: StoredMachine,
  values: Record<string, ParameterValue> = {},
) {
  return {
    saveMachine: jest.fn(),
    loadMachine: jest.fn(() => stored),
    markInterrupted: jest.fn(),
    parameterValues: jest.fn(() => values),
  };
}

function setup(
  stored?: StoredMachine,
  values?: Record<string, ParameterValue>,
) {
  const queue = fakeQueue(stored, values);
  const logger = new Logger('test');
  const log = jest.spyOn(logger, 'log').mockReturnValue(undefined);
  const warn = jest.spyOn(logger, 'warn').mockReturnValue(undefined);
  const error = jest.spyOn(logger, 'error').mockReturnValue(undefined);
  const store = new MachineStore(queue as unknown as Queue, logger);
  return { queue, store, log, warn, error };
}

describe('Machine store', () => {
  it('Should save the state, entry and status of a machine', () => {
    const { queue, store } = setup();

    store.save({ state: 'create', entry: 2 }, 'running');

    expect(queue.saveMachine).toHaveBeenCalledWith({
      state: 'create',
      entry: 2,
      status: 'running',
    });
  });

  it('Should log a failed save without throwing', () => {
    const { queue, store, error } = setup();
    queue.saveMachine.mockImplementation(() => {
      throw new Error('database is not open');
    });

    expect(() =>
      store.save({ state: 'create', entry: 1 }, 'valid'),
    ).not.toThrow();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('database is not open'),
    );
  });

  it('Should mark the commands interrupted and ignore a row without a state machine', () => {
    const stored = { state: 'execute', entry: 3, status: 'running' } as const;
    const { queue, store, log } = setup(stored);

    expect(store.restore()).toEqual({
      state: undefined,
      entry: 0,
      status: 'none',
    });
    expect(queue.markInterrupted).toHaveBeenCalledWith(expect.any(String));
    expect(queue.saveMachine).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('execute'));
  });

  it('Should log nothing without a row or a state machine', () => {
    const { queue, store, log } = setup();

    store.restore();

    expect(queue.markInterrupted).toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('Should write the recovered machine back', () => {
    const stored = { state: 'execute', entry: 3, status: 'running' } as const;
    const { queue, store, warn } = setup(stored);

    const recovered = store.restore(definition, new Parameters(new Map()));

    const resumed = { state: 'execute', entry: 3, status: 'interrupted' };
    expect(recovered).toEqual(resumed);
    expect(queue.markInterrupted).toHaveBeenCalled();
    expect(queue.saveMachine).toHaveBeenCalledWith(resumed);
    expect(warn).not.toHaveBeenCalled();
  });

  it('Should warn about an unknown state and dropped parameters', () => {
    const stored = { state: 'configure', entry: 4, status: 'valid' } as const;
    const values = { scope: 'triple', removed: 1 };
    const { store, warn } = setup(stored, values);
    const declared = new Parameters(definition.parameters);

    expect(store.restore(definition, declared)).toMatchObject({
      state: undefined,
      entry: 4,
      status: 'none',
    });
    expect(declared.values()).toEqual({ scope: 'single' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('configure'));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('scope, removed'),
    );
  });
});
