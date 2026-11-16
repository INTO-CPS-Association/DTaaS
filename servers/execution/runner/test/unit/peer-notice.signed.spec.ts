import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import Signer from 'src/auth/signer';
import { offlineNotification } from 'src/dto/notify.dto';
import { presenceWill } from 'src/mqtt/mqtt.config';
import readNotice from 'src/peers/peer-notice';
import { PeerConfig } from 'src/peers/peers.config';

// The signer of the runner hospital-2, as Config builds it from its id
// and auth.key
const signer = new Signer(
  generateKeyPairSync('ed25519').privateKey,
  'hospital-2',
);

// hospital-2 as another runner lists it, with the publicKey of its
// descriptor
const peer: PeerConfig = {
  id: 'hospital-2',
  topic: 'dtaas/hospital-2',
  attributes: {},
  enabled: true,
  publicKey: String(signer.publicKey()),
};

const state = {
  kind: 'state',
  id: 'hospital-2',
  time: '2026-10-26T14:56:02.410Z',
  data: { id: 'hospital-2', machine: null },
};

const encoded = (value: unknown) => Buffer.from(signer.encode(value));

describe('readNotice of what Signer signs', () => {
  it('Should take a state notice that the peer signed', () => {
    expect(readNotice(peer, 'state', encoded(state))).toEqual({
      data: { id: 'hospital-2', machine: null },
    });
  });

  it('Should take the signed will, which has no time', () => {
    const will = presenceWill('dtaas/hospital-2', 'hospital-2', signer);

    expect(
      readNotice(peer, 'presence', Buffer.from(String(will?.payload))),
    ).toEqual({ data: { online: false } });
  });

  it('Should drop a notice that a runner of another id signed', () => {
    const impostor = new Signer(
      generateKeyPairSync('ed25519').privateKey,
      'hospital-3',
    );
    const notice = impostor.encode(offlineNotification('hospital-2', null));

    expect(readNotice(peer, 'presence', Buffer.from(notice))).toEqual({
      dropped: 'bad signature',
    });
  });
});
