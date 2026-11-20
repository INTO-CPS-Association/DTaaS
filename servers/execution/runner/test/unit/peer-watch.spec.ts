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
import MqttService, { FollowListener } from 'src/mqtt/mqtt.service';
import PeerWatch from 'src/peers/peer-watch';
import Peers from 'src/peers/peers';
import { PeerConfig } from 'src/peers/peers.config';

const peer = (id: string, topic?: string, enabled = true): PeerConfig => ({
  id,
  topic,
  url: topic === undefined ? `http://${id}` : undefined,
  attributes: {},
  enabled,
});

const LIST = [
  peer('hospital-2', 'dtaas/hospital-2'),
  peer('hospital-3'),
  peer('hospital-4', 'dtaas/hospital-4', false),
];

const online = {
  kind: 'presence',
  id: 'hospital-2',
  time: '2026-10-26T14:56:02.410Z',
  data: { online: true, descriptor: { id: 'hospital-2' } },
};

const store = () => ({ setPeers: jest.fn(), peerSwitches: () => new Map() });

describe('PeerWatch', () => {
  let peers: Peers;
  let listeners: Map<string, FollowListener>;
  let mqtt: {
    follow: jest.Mock<(topic: string, listener: FollowListener) => unknown>;
    unfollow: jest.Mock<(topic: string) => void>;
  };
  let watch: PeerWatch;

  beforeEach(() => {
    peers = new Peers();
    listeners = new Map();
    mqtt = {
      follow: jest.fn((topic: string, listener: FollowListener) =>
        listeners.set(topic, listener),
      ),
      unfollow: jest.fn<(topic: string) => void>(),
    };
    const descriptor = { peers: () => peers };
    watch = new PeerWatch(
      descriptor as unknown as DescriptorService,
      mqtt as unknown as MqttService,
    );
    peers.load(LIST, store());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should follow the notify topics of each enabled peer with a topic', () => {
    expect(watch).toBeInstanceOf(PeerWatch);
    expect([...listeners.keys()]).toEqual([
      'dtaas/hospital-2/notify/presence',
      'dtaas/hospital-2/notify/state',
    ]);
  });

  it('Should unfollow a disabled peer and follow an enabled one', () => {
    peers.set({ 'hospital-2': false, 'hospital-3': false, 'hospital-4': true });

    expect(mqtt.unfollow.mock.calls).toEqual([
      ['dtaas/hospital-2/notify/presence'],
      ['dtaas/hospital-2/notify/state'],
    ]);
    expect(mqtt.follow).toHaveBeenLastCalledWith(
      'dtaas/hospital-4/notify/state',
      expect.any(Function),
    );
  });

  it('Should pass a notice on to the peers', () => {
    const presence = listeners.get('dtaas/hospital-2/notify/presence');

    presence?.(Buffer.from(JSON.stringify(online)));

    expect(peers.document()['hospital-2']).toMatchObject({
      online: true,
      descriptor: { id: 'hospital-2' },
    });
  });

  it('Should log and drop a notice that does not read', () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const state = listeners.get('dtaas/hospital-2/notify/state');

    state?.(Buffer.from(JSON.stringify(online)));

    expect(warn).toHaveBeenCalledWith(
      'Dropped a state notice of peer hospital-2: not a state notice of hospital-2',
    );
    expect(peers.document()['hospital-2']).toMatchObject({ state: null });
  });
});
