import { describe, expect, it, jest } from '@jest/globals';
import { EscalationData } from 'src/dto/escalation.dto';
import { parseDefinition } from 'src/fsm/definition';
import Escalations, { Escalation, escalationSchema } from 'src/fsm/escalation';
import StateMachine from 'src/fsm/state-machine';

const known = { commands: ['create', 'execute'], peers: [] };

const STATES = `
events: [restart]
states:
  create:
  execute:
`;

const parse = (text: string) => parseDefinition(text, 'dt.yaml', known);

const BOTH: Escalation = { onFailure: true, onNoTransition: true };

// Escalations with the flags and a listener, and a machine in no state
function setup(flags?: Escalation) {
  const escalations = new Escalations();
  escalations.declare(flags);
  const listener = jest.fn((_data: EscalationData) => undefined);
  escalations.on(listener);
  const machine = new StateMachine(parse(STATES));
  return { escalations, listener, machine };
}

describe('Escalation section', () => {
  it('Should default both flags to false when the section is missing', () => {
    expect(parse(STATES).escalation).toEqual({
      onFailure: false,
      onNoTransition: false,
    });
  });

  it('Should default a flag that a partial section leaves out', () => {
    const text = `${STATES}escalation:\n  onFailure: true\n`;

    expect(parse(text).escalation).toEqual({
      onFailure: true,
      onNoTransition: false,
    });
  });

  it.each([
    ['an unknown key', { onCrash: true }],
    ['a non-boolean flag', { onFailure: 'yes' }],
    ['a list', [true]],
  ])('Should reject %s', (_, section) => {
    expect(escalationSchema.safeParse(section).success).toBe(false);
  });

  it('Should reject a __proto__ key in the file', () => {
    const text = `${STATES}escalation:\n  __proto__: true\n`;

    expect(() => parse(text)).toThrow('Invalid state machine in dt.yaml');
  });
});

describe('Escalations', () => {
  it('Should emit nothing without flags', () => {
    const { escalations, listener, machine } = setup();
    machine.enter('execute');

    escalations.failure(machine);
    escalations.noTransition(machine, 'restart');

    expect(listener).not.toHaveBeenCalled();
  });

  it('Should emit a failure on each call', () => {
    const { escalations, listener, machine } = setup(BOTH);
    machine.enter('execute');

    escalations.failure(machine);
    escalations.failure(machine);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith({
      trigger: 'failure',
      state: 'execute',
      entry: 1,
      event: null,
      reason: 'script of state execute failed',
      proposal: null,
    });
  });

  it('Should emit an event without a transition once per entry', () => {
    const { escalations, listener, machine } = setup(BOTH);
    machine.enter('execute');

    escalations.noTransition(machine, 'restart');
    escalations.noTransition(machine, 'restart');
    escalations.noTransition(machine, 'stop');
    machine.enter('execute');
    escalations.noTransition(machine, 'restart');

    expect(
      listener.mock.calls.map(([data]) => [data.event, data.entry]),
    ).toEqual([
      ['restart', 1],
      ['stop', 1],
      ['restart', 2],
    ]);
    expect(listener.mock.calls[0][0]).toMatchObject({
      trigger: 'no-transition',
      state: 'execute',
      reason: 'no transition for restart in state execute',
      proposal: null,
    });
  });

  it('Should emit nothing for an event before the first transition', () => {
    const { escalations, listener, machine } = setup(BOTH);

    escalations.noTransition(machine, 'restart');

    expect(listener).not.toHaveBeenCalled();
  });

  it('Should emit a request without a machine', () => {
    const { escalations, listener } = setup();
    const body = { reason: 'capacity', proposal: { scope: 'multi' } };

    expect(escalations.request(body, undefined, undefined)).toEqual({
      status: 'accepted',
    });
    expect(listener).toHaveBeenCalledWith({
      trigger: 'request',
      state: null,
      entry: 0,
      event: null,
      reason: 'capacity',
      proposal: { scope: 'multi' },
    });
  });

  it('Should emit a request before the first transition', () => {
    const { escalations, listener, machine } = setup();

    escalations.request({ reason: 'capacity' }, undefined, machine);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ state: null, entry: 0, event: null }),
    );
  });

  it('Should forget the escalated events on a new declaration', () => {
    const { escalations, listener, machine } = setup(BOTH);
    machine.enter('execute');
    escalations.noTransition(machine, 'restart');

    escalations.declare(BOTH);
    const reloaded = new StateMachine(parse(STATES));
    reloaded.enter('execute');
    escalations.noTransition(reloaded, 'restart');

    expect(listener.mock.calls.map(([data]) => data.entry)).toEqual([1, 1]);
  });

  it('Should emit a request with the state of the machine', () => {
    const { escalations, listener, machine } = setup();
    machine.enter('create');

    escalations.request({ reason: 'capacity' }, undefined, machine);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'create', entry: 1, proposal: null }),
    );
  });

  it('Should emit once per request key, whatever the body', () => {
    const { escalations, listener } = setup();

    const first = escalations.request({ reason: 'a' }, 'key-1', undefined);
    const repeat = escalations.request({ reason: 'b' }, 'key-1', undefined);

    expect(repeat).toEqual(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('Should emit every request without a key', () => {
    const { escalations, listener } = setup();

    escalations.request({ reason: 'a' }, undefined, undefined);
    escalations.request({ reason: 'a' }, undefined, undefined);

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
