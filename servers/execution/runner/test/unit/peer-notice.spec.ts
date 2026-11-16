import { describe, expect, it } from '@jest/globals';
import readNotice from 'src/peers/peer-notice';
import { PeerConfig } from 'src/peers/peers.config';
import { newCaller, signToken } from 'test/sign.util';

const signer = newCaller('hospital-2');

const other = newCaller('hospital-2');

const keyless: PeerConfig = {
  id: 'hospital-2',
  topic: 'dtaas/hospital-2',
  attributes: {},
  enabled: true,
};

const keyed: PeerConfig = { ...keyless, publicKey: signer.publicKey };

const descriptor = { id: 'hospital-2', peers: [] };

const presence = {
  kind: 'presence',
  id: 'hospital-2',
  time: '2026-10-26T14:56:02.410Z',
  data: { online: true, descriptor },
};

const state = { ...presence, kind: 'state', data: { id: 'hospital-2' } };

const json = (value: unknown) => Buffer.from(JSON.stringify(value));

const signed = (
  value: unknown,
  header = { alg: 'Ed25519', kid: 'hospital-2' },
) => Buffer.from(signToken(signer.privateKey, header, value as object));

describe('readNotice', () => {
  it('Should give the data of a notice of a keyless peer', () => {
    expect(readNotice(keyless, 'presence', json(presence))).toEqual({
      data: { online: true, descriptor },
    });
    expect(readNotice(keyless, 'state', json(state))).toEqual({
      data: { id: 'hospital-2' },
    });
  });

  it('Should take the offline will, which has no time', () => {
    const will = { ...presence, time: null, data: { online: false } };

    expect(readNotice(keyless, 'presence', json(will))).toEqual({
      data: { online: false },
    });
  });

  it('Should map an empty payload to null', () => {
    expect(readNotice(keyed, 'state', Buffer.alloc(0))).toEqual({
      data: null,
    });
  });

  it('Should unwrap a notice that the key of a keyed peer signed', () => {
    expect(readNotice(keyed, 'state', signed(state))).toEqual({
      data: { id: 'hospital-2' },
    });
  });

  it.each([
    ['bad JSON', keyless, 'state', Buffer.from('{"kind":'), /not JSON/],
    ['a wrong kind', keyless, 'presence', json(state), /not a presence notice/],
    [
      'a wrong id',
      keyless,
      'state',
      json({ ...state, id: 'hospital-3' }),
      /not a state notice of hospital-2/,
    ],
    [
      'presence data without online',
      keyless,
      'presence',
      json({ ...presence, data: { descriptor } }),
      /not a presence notice/,
    ],
    [
      'an unsigned notice of a keyed peer',
      keyed,
      'state',
      json(state),
      /not signed/,
    ],
    [
      'a signed notice of a keyless peer',
      keyless,
      'state',
      signed(state),
      /not JSON/,
    ],
    [
      'a signature of another key',
      { ...keyed, publicKey: other.publicKey },
      'state',
      signed(state),
      /bad signature/,
    ],
    [
      'a signature with another kid',
      keyed,
      'state',
      signed(state, { alg: 'Ed25519', kid: 'hospital-3' }),
      /bad signature/,
    ],
  ] as const)('Should drop %s', (_, peer, kind, payload, reason) => {
    const reading = readNotice(peer, kind, payload);

    expect(reading).toEqual({ dropped: expect.stringMatching(reason) });
  });
});
