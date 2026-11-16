import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import DescriptorService from 'src/descriptor.service';
import { EscalationData } from 'src/dto/escalation.dto';
import PeerEventsService from 'src/fsm/peer-events.service';
import Peers from 'src/peers/peers';
import {
  createService,
  MACHINE_FILE,
  names,
  PEERS,
  scriptFolder,
  settle,
} from './fsm.fixture';

const DEFINITION = `
events: [neighbour-full, neighbour-down]
escalation:
  onNoTransition: true
subscriptions:
  - peer: hospital-2
    when:
      state: full
    event: neighbour-full
  - peer: hospital-2
    when:
      online: false
    event: neighbour-down
states:
  create:
    transitions:
      neighbour-full:
        state: create
        stop: true
  execute:
  terminate:
`;

const inState = (state: string) => ({ id: 'hospital-2', machine: { state } });

describe('State machine service with peer events', () => {
  let dir: string;

  beforeAll(() => {
    dir = scriptFolder(DEFINITION);
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The service, its peers wired to it as at init, and a listener of its
  // escalations; refused events log, which the tests silence
  function setup() {
    jest.spyOn(Logger.prototype, 'log').mockReturnValue();
    jest.spyOn(Logger.prototype, 'warn').mockReturnValue();
    jest.spyOn(Logger.prototype, 'debug').mockReturnValue();
    const created = createService(join(dir, MACHINE_FILE));
    const peers = new Peers();
    const descriptor = { peers: () => peers } as unknown as DescriptorService;
    const events = new PeerEventsService(created.service, descriptor);
    events.onModuleInit();
    peers.load(PEERS, { setPeers: jest.fn(), peerSwitches: () => new Map() });
    const listener = jest.fn((_data: EscalationData) => undefined);
    created.service.onEscalation(listener);
    // the notices of hospital-2, one after the other
    const notice = (kind: 'state' | 'presence', data: unknown) =>
      peers.observe('hospital-2', kind, data);
    return { ...created, notice, listener };
  }

  it('Should take a stop transition to the same state and restart its script', async () => {
    const { service, manager, notice } = setup();
    service.transition('create');
    notice('state', inState('open'));

    notice('state', inState('full'));
    await settle();

    expect(manager.stop).toHaveBeenCalledWith('create');
    expect(names(manager.newCommand.mock.calls)).toEqual(['create', 'create']);
    expect(service.check()).toMatchObject({ state: 'create', entry: 2 });
  });

  it('Should escalate an event without a transition once per entry', () => {
    const { service, notice, listener } = setup();
    service.transition('execute');

    notice('presence', { online: false });
    notice('presence', { online: true });
    notice('presence', { online: false });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: 'no-transition',
        event: 'neighbour-down',
        reason: 'no transition for neighbour-down in state execute',
      }),
    );
  });

  it('Should refuse an event before the first transition, without escalating', () => {
    const { service, notice, listener } = setup();

    notice('state', inState('full'));
    service.transition('create');
    notice('state', inState('full'));

    expect(listener).not.toHaveBeenCalled();
    expect(service.check()).toMatchObject({ state: 'create', entry: 1 });
  });

  it('Should refuse an event during shutdown, starting no script', () => {
    const { service, manager, notice } = setup();
    service.transition('create');
    service.beforeApplicationShutdown();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockReturnValue();

    notice('state', inState('full'));

    expect(warn).toHaveBeenCalledWith(
      'Stayed in state create on neighbour-full: stopping',
    );
    expect(manager.newCommand).toHaveBeenCalledTimes(1);
  });
});
