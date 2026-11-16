import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';
import DescriptorService from 'src/descriptor.service';
import { fsmReply, FsmReplyDto, FsmStatus } from 'src/dto/fsm.dto';
import { Definition } from 'src/fsm/definition';
import FsmService from 'src/fsm/fsm.service';
import PeerEventsService from 'src/fsm/peer-events.service';
import Peers from 'src/peers/peers';
import { PeerConfig } from 'src/peers/peers.config';

const PEER: PeerConfig = {
  id: 'hospital-2',
  topic: 'dtaas/hospital-2',
  attributes: {},
  enabled: true,
};

const SUBSCRIPTIONS = [
  { peer: 'hospital-2', when: { state: 'full' }, event: 'neighbour-full' },
];

const FULL = { id: 'hospital-2', machine: { state: 'full' } };

const store = () => ({
  setPeers: jest.fn(),
  peerSwitches: () => new Map<string, boolean>(),
});

describe('PeerEventsService', () => {
  let peers: Peers;
  let fsm: {
    declared: jest.Mock<() => Definition | undefined>;
    event: jest.Mock<(event: string) => FsmReplyDto>;
  };

  // The service with the subscriptions, if any, once its hook ran
  function createService(subscriptions?: typeof SUBSCRIPTIONS) {
    fsm.declared.mockReturnValue(
      subscriptions && ({ subscriptions } as unknown as Definition),
    );
    const descriptor = { peers: () => peers };
    const service = new PeerEventsService(
      fsm as unknown as FsmService,
      descriptor as unknown as DescriptorService,
    );
    peers.load([PEER], store());
    service.onModuleInit();
    return service;
  }

  const reply = (status: FsmStatus, state = 'open') => {
    fsm.event.mockReturnValue(fsmReply(status, state));
  };

  beforeEach(() => {
    peers = new Peers();
    fsm = { declared: jest.fn(), event: jest.fn() };
    reply('accepted');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should raise the event of a notice, logging the peer and condition', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockReturnValue();
    createService(SUBSCRIPTIONS);

    peers.observe('hospital-2', 'state', FULL);

    expect(fsm.event).toHaveBeenCalledWith('neighbour-full');
    expect(log).toHaveBeenCalledWith(
      'Raised neighbour-full on state full of peer hospital-2: entered open',
    );
  });

  it('Should raise nothing without a state machine', () => {
    createService();

    peers.observe('hospital-2', 'state', FULL);

    expect(fsm.event).not.toHaveBeenCalled();
  });

  it('Should log a refused event at its level', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockReturnValue();
    const debug = jest.spyOn(Logger.prototype, 'debug').mockReturnValue();
    createService(SUBSCRIPTIONS);
    reply('stopping');
    peers.observe('hospital-2', 'state', FULL);
    peers.set({ 'hospital-2': false });
    peers.set({ 'hospital-2': true });
    reply('no transition');
    peers.observe('hospital-2', 'state', FULL);

    expect(warn).toHaveBeenCalledWith(
      'Stayed in state open on neighbour-full: stopping',
    );
    expect(debug).toHaveBeenCalledWith(
      'Stayed in state open on neighbour-full: no transition',
    );
  });

  it('Should forget a disabled peer, so its next notice counts as first', () => {
    createService(SUBSCRIPTIONS);
    peers.observe('hospital-2', 'state', FULL);
    peers.observe('hospital-2', 'state', FULL);

    peers.set({ 'hospital-2': false });
    peers.observe('hospital-2', 'state', FULL);
    peers.set({ 'hospital-2': true });
    peers.observe('hospital-2', 'state', FULL);

    expect(fsm.event).toHaveBeenCalledTimes(2);
  });
});
