import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import Peers, { PeerStore } from 'src/peers/peers';
import { PeerConfig } from 'src/peers/peers.config';

const peer = (id: string, enabled = true): PeerConfig => ({
  id,
  topic: `dtaas/${id}`,
  attributes: { distance: 12.4 },
  enabled,
});

const LIST = [peer('hospital-2'), peer('hospital-3', false)];

const descriptor = { id: 'hospital-2', peers: ['hospital-1'] };

const unknown = { online: null, descriptor: null, state: null };

// A store over a map, as Queue keeps the switches
function fakeStore(stored: [string, boolean][] = []) {
  const switches = new Map(stored);
  return {
    switches,
    setPeers: jest.fn((changes: ReadonlyMap<string, boolean>) =>
      changes.forEach((enabled, id) => switches.set(id, enabled)),
    ),
    peerSwitches: () => new Map(switches),
  };
}

describe('Peers', () => {
  let peers: Peers;
  let store: ReturnType<typeof fakeStore>;
  let signals: [string, boolean][];

  beforeEach(() => {
    peers = new Peers();
    store = fakeStore();
    signals = [];
    peers.onEnabled(({ id }, enabled) => signals.push([id, enabled]));
  });

  it('Should list nothing before it is loaded', () => {
    expect(peers.document()).toEqual({});
    expect(peers.enabledIds()).toEqual([]);
    expect(peers.set({})).toEqual([]);
  });

  it('Should list each peer and signal the enabled ones on load', () => {
    peers.load(LIST, store);

    expect(peers.enabledIds()).toEqual(['hospital-2']);
    expect(signals).toEqual([['hospital-2', true]]);
    expect(peers.document()).toEqual({
      'hospital-2': {
        topic: 'dtaas/hospital-2',
        url: null,
        attributes: { distance: 12.4 },
        enabled: true,
        ...unknown,
      },
      'hospital-3': expect.objectContaining({ enabled: false, ...unknown }),
    });
  });

  it('Should let a stored switch override the file', () => {
    peers.load(
      LIST,
      fakeStore([
        ['hospital-2', false],
        ['hospital-3', true],
      ]),
    );

    expect(peers.enabledIds()).toEqual(['hospital-3']);
    expect(signals).toEqual([['hospital-3', true]]);
  });

  it('Should list every problem without applying any', () => {
    peers.load(LIST, store);

    expect(
      peers.set({
        'hospital-9': false,
        'hospital-2': 'off',
        'hospital-3': true,
      }),
    ).toEqual(['unknown peer hospital-9', 'peer hospital-2 takes a boolean']);
    expect(peers.enabledIds()).toEqual(['hospital-2']);
    expect(store.setPeers).not.toHaveBeenCalled();
  });

  it('Should store, apply and signal each change, ignoring equal values', () => {
    peers.load(LIST, store);
    signals = [];

    expect(peers.set({ 'hospital-2': false, 'hospital-3': false })).toEqual([]);
    expect(store.switches).toEqual(new Map([['hospital-2', false]]));
    expect(peers.enabledIds()).toEqual([]);
    expect(signals).toEqual([['hospital-2', false]]);
    expect(peers.set({})).toEqual([]);
    expect(store.setPeers).toHaveBeenLastCalledWith(new Map());
  });

  it('Should apply nothing when the store fails', () => {
    peers.load(LIST, store);
    store.setPeers.mockImplementation(() => {
      throw new Error('disk full');
    });

    expect(() => peers.set({ 'hospital-2': false })).toThrow('disk full');
    expect(peers.enabledIds()).toEqual(['hospital-2']);
    expect(signals).toEqual([['hospital-2', true]]);
  });

  it('Should remember the presence and the state of an enabled peer', () => {
    peers.load(LIST, store);
    const state = { id: 'hospital-2', machine: null };

    peers.observe('hospital-2', 'presence', { online: true, descriptor });
    peers.observe('hospital-2', 'state', state);
    peers.observe('hospital-2', 'presence', { online: false });

    expect(peers.document()['hospital-2']).toMatchObject({
      online: false,
      descriptor,
      state,
    });
  });

  it('Should clear a part on an empty notice', () => {
    peers.load(LIST, store);
    peers.observe('hospital-2', 'presence', { online: true, descriptor });
    peers.observe('hospital-2', 'state', { id: 'hospital-2' });

    peers.observe('hospital-2', 'presence', null);
    peers.observe('hospital-2', 'state', null);

    expect(peers.document()['hospital-2']).toMatchObject(unknown);
  });

  it('Should forget a disabled peer and ignore its notices', () => {
    peers.load(LIST, store);
    peers.observe('hospital-2', 'presence', { online: true, descriptor });

    peers.set({ 'hospital-2': false });
    peers.observe('hospital-2', 'state', { id: 'hospital-2' });
    peers.observe('hospital-3', 'presence', { online: true, descriptor });

    expect(peers.document()['hospital-2']).toMatchObject(unknown);
    expect(peers.document()['hospital-3']).toMatchObject(unknown);
  });

  it('Should signal each notice it stored, after storing it', () => {
    peers.load(LIST, store);
    const seen: unknown[] = [];
    peers.onNotice((id, kind, data) =>
      seen.push([id, kind, data, peers.document()[id].online]),
    );

    peers.observe('hospital-2', 'presence', { online: true });
    peers.observe('hospital-3', 'presence', { online: true });

    expect(seen).toEqual([['hospital-2', 'presence', { online: true }, true]]);
  });

  it('Should take a store of the PeerStore shape', () => {
    const typed: PeerStore = store;

    peers.load([], typed);

    expect(peers.document()).toEqual({});
  });
});
