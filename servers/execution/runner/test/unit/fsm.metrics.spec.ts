import { describe, expect, it } from '@jest/globals';
import { EscalationData } from 'src/dto/escalation.dto';
import { COMPLETION, FsmStateDto, ScriptStatus, STATUS } from 'src/dto/fsm.dto';
import { RunOutcome } from 'src/interfaces/runner.interface';
import Metrics from 'src/fsm/metrics';
import { FsmRequest } from 'src/fsm/requests';

// The clock of the tests, in milliseconds since the runner started
const START = 1_000_000;
const at = (seconds: number) => START + seconds * 1000;

const machine = (
  state: string | null,
  entry: number,
  status: ScriptStatus,
): FsmStateDto => ({ state, entry, status, events: [] });

const UNSTARTED = machine(null, 0, 'none');

const escalation = (trigger: EscalationData['trigger']): EscalationData => ({
  trigger,
  state: null,
  entry: 0,
  event: null,
  reason: 'capacity',
  proposal: null,
});

// A machine that entered open at 1 s and full at 4 s
function twoEntries(): Metrics {
  const metrics = new Metrics();
  metrics.start(UNSTARTED, START);
  metrics.observe(machine('open', 1, 'running'), at(1));
  metrics.observe(machine('full', 2, 'running'), at(4));
  return metrics;
}

describe('Metrics of the state machine', () => {
  it('reports no machine without a state machine', () => {
    const metrics = new Metrics();
    metrics.start(undefined, START);
    metrics.observe(undefined, at(1));

    expect(metrics.report(at(2)).machine).toBeNull();
  });

  it('reports empty counters before the first transition', () => {
    const metrics = new Metrics();
    metrics.start(UNSTARTED, START);

    expect(metrics.report(at(2))).toEqual({
      machine: {
        entries: {},
        seconds: {},
        completions: { $success: 0, $failure: 0, $stopped: 0 },
        transitions: { requested: 0, accepted: 0 },
        events: { requested: 0, accepted: 0, noTransition: 0 },
      },
      escalations: { request: 0, failure: 0, 'no-transition': 0 },
    });
  });

  it('counts the entries and the seconds in each state, to the ms', () => {
    const metrics = twoEntries();
    metrics.observe(machine('open', 3, 'running'), at(6.5));

    const report = metrics.report(at(7.0004))?.machine;

    expect(report?.entries).toEqual({ open: 2, full: 1 });
    expect(report?.seconds).toEqual({ open: 3.5, full: 2.5 });
  });

  it('counts a restored state from the start, without an entry', () => {
    const metrics = new Metrics();
    metrics.start(machine('open', 4, 'interrupted'), START);
    metrics.observe(machine('full', 5, 'running'), at(2));

    const report = metrics.report(at(3))?.machine;

    expect(report?.entries).toEqual({ open: 0, full: 1 });
    expect(report?.seconds).toEqual({ open: 2, full: 1 });
  });

  it.each([
    ['valid', '$success'],
    ['invalid', '$failure'],
    ['stopped', '$stopped'],
  ] as const)('counts a script that ends %s as %s', (status, event) => {
    const metrics = twoEntries();
    metrics.observe(machine('full', 2, status), at(5));
    metrics.observe(machine('full', 2, status), at(6));

    expect(metrics.report(at(6)).machine?.completions).toEqual({
      $success: 0,
      $failure: 0,
      $stopped: 0,
      [event]: 1,
    });
  });

  it('does not count the completion of an entry that was left', () => {
    const metrics = twoEntries();
    metrics.observe(machine('open', 3, 'valid'), at(5));

    const { completions } = metrics.report(at(6)).machine ?? {};

    expect(completions).toEqual({ $success: 0, $failure: 0, $stopped: 0 });
  });

  it('counts the answers to transition and event requests', () => {
    const metrics = twoEntries();
    const transition: FsmRequest = { kind: 'transition', name: 'open' };
    const event: FsmRequest = { kind: 'event', name: 'transition' };
    // an event named like a transition counts as an event
    metrics.answered(transition, { status: 'accepted', state: 'open' });
    metrics.answered(transition, { status: 'invalid state', state: null });
    metrics.answered(event, { status: 'accepted', state: 'full' });
    metrics.answered(event, { status: 'no transition', state: 'x' });
    metrics.answered(event, { status: 'busy', state: 'x' });

    const report = metrics.report(at(6)).machine;

    expect(report?.transitions).toEqual({ requested: 2, accepted: 1 });
    expect(report?.events).toEqual({
      requested: 3,
      accepted: 1,
      noTransition: 1,
    });
  });

  it.each(Object.keys(STATUS) as RunOutcome[])(
    'counts a script that ends with %s by its completion event',
    (outcome) => {
      const metrics = twoEntries();
      metrics.observe(machine('full', 2, STATUS[outcome]), at(5));

      const { completions } = metrics.report(at(6)).machine ?? {};

      expect(completions?.[COMPLETION[outcome]]).toBe(1);
    },
  );

  it('counts the escalations by trigger, with or without a machine', () => {
    const metrics = new Metrics();
    metrics.start(undefined, START);
    metrics.escalated(escalation('request'));
    metrics.escalated(escalation('request'));
    metrics.escalated(escalation('no-transition'));

    expect(metrics.report(at(1)).escalations).toEqual({
      request: 2,
      failure: 0,
      'no-transition': 1,
    });
  });

  it('reports copies that later counts do not change', () => {
    const metrics = twoEntries();
    const report = metrics.report(at(5));
    metrics.observe(machine('open', 3, 'running'), at(6));
    metrics.escalated(escalation('failure'));

    expect(report.machine?.entries).toEqual({ open: 1, full: 1 });
    expect(report.escalations.failure).toBe(0);
  });
});
