import { generateKeyPairSync } from 'node:crypto';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import Signer from 'src/auth/signer';
import Config from 'src/config/configuration.service';
import { PeerConfig } from 'src/peers/peers.config';
import { poll } from './fsm.util';
import { Broker, startBroker, startRunner, stopBroker } from './mqtt.util';

const BASE = 'dtaas/test/signed';

type Entry = { online: boolean | null; descriptor: unknown; state: unknown };

const entryOf = (body: Record<string, unknown>) => body['hospital-2'] as Entry;

// hospital-2 signs with its id as the kid, and hospital-1 lists it with
// the public key of that signer
describe('A runner following a signed peer runner', () => {
  const signer = new Signer(
    generateKeyPairSync('ed25519').privateKey,
    'hospital-2',
  );
  let broker: Broker;
  let apps: INestApplication[];

  const peer = (publicKey: string): PeerConfig => ({
    id: 'hospital-2',
    topic: `${BASE}/hospital-2`,
    attributes: {},
    enabled: true,
    publicKey,
  });

  // hospital-1, with hospital-2 listed under the public key
  const follower = (publicKey: string) =>
    startRunner(
      { url: broker.url, topic: `${BASE}/hospital-1`, protocolVersion: 4 },
      (config: Config) => {
        jest.spyOn(config, 'getId').mockReturnValue('hospital-1');
        jest.spyOn(config, 'getPeers').mockReturnValue([peer(publicKey)]);
      },
    );

  // hospital-2, which signs and lists no peer
  const signed = () =>
    startRunner(
      { url: broker.url, topic: `${BASE}/hospital-2`, protocolVersion: 4 },
      (config: Config) => {
        jest.spyOn(config, 'getId').mockReturnValue('hospital-2');
        jest.spyOn(config, 'getPeers').mockReturnValue([]);
        jest.spyOn(config, 'getSigner').mockReturnValue(signer);
      },
    );

  beforeEach(async () => {
    broker = await startBroker();
    apps = [];
  });

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    await stopBroker(broker);
  });

  it('takes the signed notices, with the publicKey of the descriptor', async () => {
    apps.push(await follower(String(signer.publicKey())));
    apps.push(await signed());

    const body = await poll(apps[0], '/peers', (peers) => {
      const { online, state } = entryOf(peers);
      return online === true && state !== null;
    });

    expect(entryOf(body).descriptor).toMatchObject({
      id: 'hospital-2',
      publicKey: signer.publicKey(),
    });
    expect(entryOf(body).state).toMatchObject({ id: 'hospital-2' });
  });
});
