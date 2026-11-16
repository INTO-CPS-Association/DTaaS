import { afterEach, describe, expect, it, jest } from '@jest/globals';
import Config from 'src/config/configuration.service';
import DescriptorService from 'src/descriptor.service';
import { EscalationData } from 'src/dto/escalation.dto';
import { FsmReplyDto, FsmStateDto } from 'src/dto/fsm.dto';
import { EscalationListener } from 'src/fsm/escalation';
import FsmService from 'src/fsm/fsm.service';
import { AnswerListener } from 'src/fsm/requests';
import Changes from 'src/notify/changes';
import Queue from 'src/queue.service';

const COUNTS = {
  valid: 2,
  failed: 1,
  stopped: 0,
  invalid: 0,
  interrupted: 1,
  running: 1,
};

const TOTALS = {
  admit: { cpuSeconds: 2.031, peakRssBytes: 117440512, processes: 3 },
};

const NO_ESCALATIONS = { request: 0, failure: 0, 'no-transition': 0 };

const ESCALATION: EscalationData = {
  trigger: 'request',
  state: 'open',
  entry: 1,
  event: null,
  reason: 'capacity',
  proposal: null,
};

// A descriptor service over a state machine whose signals the test
// sends, in the machine given
function createService(start: FsmStateDto | undefined) {
  let machine = start;
  const changes = new Changes();
  const fsm = {
    check: () => machine,
    onChange: jest.fn((listener: () => void) => changes.on(listener)),
    onAnswer: jest.fn<(listener: AnswerListener) => void>(),
    onEscalation: jest.fn<(listener: EscalationListener) => void>(),
  };
  const queue = {
    commandCounts: jest.fn(() => COUNTS),
    resourceTotals: jest.fn(() => TOTALS),
    peerSwitches: () => new Map(),
  };
  const service = new DescriptorService(
    { getPeers: () => [] } as unknown as Config,
    fsm as unknown as FsmService,
    queue as unknown as Queue,
  );
  const move = (next: FsmStateDto) => {
    machine = next;
    changes.emit();
  };
  return { service, fsm, move };
}

const state = (name: string, entry: number): FsmStateDto => ({
  state: name,
  entry,
  status: 'running',
  events: [],
});

describe('Descriptor service metrics', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports the counters since the start, without a machine', () => {
    const { service, fsm } = createService(undefined);
    service.onModuleInit();
    const [escalate] = fsm.onEscalation.mock.calls[0];
    escalate(ESCALATION);

    expect(service.metrics()).toEqual({
      since: new Date(performance.timeOrigin).toISOString(),
      uptime: expect.any(Number),
      commands: COUNTS,
      resources: TOTALS,
      machine: null,
      escalations: { ...NO_ESCALATIONS, request: 1 },
    });
  });

  it('counts the changes, answers and escalations it subscribed to', () => {
    jest.useFakeTimers();
    const { service, fsm, move } = createService(state('open', 4));
    service.onModuleInit();
    const [answer] = fsm.onAnswer.mock.calls[0];
    const reply: FsmReplyDto = { status: 'accepted', state: 'full' };

    jest.advanceTimersByTime(1000);
    move(state('full', 5));
    answer({ kind: 'transition', name: 'full' }, reply);
    jest.advanceTimersByTime(2500);

    const { machine, escalations } = service.metrics();
    expect(machine?.entries).toEqual({ open: 0, full: 1 });
    expect(machine?.seconds.full).toBe(2.5);
    expect(machine?.transitions).toEqual({ requested: 1, accepted: 1 });
    expect(escalations).toEqual(NO_ESCALATIONS);
  });
});
