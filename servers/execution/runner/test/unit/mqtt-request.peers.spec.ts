import { beforeEach, describe, expect, it } from '@jest/globals';
import DescriptorService from 'src/descriptor.service';
import ExecaManager from 'src/execa-manager.service';
import FsmService from 'src/fsm/fsm.service';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import Peers from 'src/peers/peers';
import { mqttRequest } from './mqtt.fixture';

const LIST = [
  {
    id: 'hospital-2',
    topic: 'dtaas/hospital-2',
    attributes: {},
    enabled: true,
  },
];

const json = (body: unknown) => Buffer.from(JSON.stringify(body));

const entry = (enabled: boolean) => ({
  'hospital-2': {
    topic: 'dtaas/hospital-2',
    url: null,
    attributes: {},
    enabled,
    online: null,
    descriptor: null,
    state: null,
  },
});

describe('MQTT request handler peers', () => {
  let handler: MqttRequestHandler;

  beforeEach(() => {
    const peers = new Peers();
    peers.load(LIST, {
      setPeers: () => undefined,
      peerSwitches: () => new Map(),
    });
    handler = new MqttRequestHandler(
      {} as ExecaManager,
      {} as FsmService,
      { peers: () => peers } as unknown as DescriptorService,
    );
  });

  it('Should return the peers', async () => {
    expect(await handler.handle('peers', mqttRequest(Buffer.alloc(0)))).toEqual(
      entry(true),
    );
  });

  it('Should disable a peer and return the peers', async () => {
    const body = await handler.handle(
      'set-peers',
      mqttRequest(json({ 'hospital-2': false })),
    );

    expect(body).toEqual(entry(false));
  });

  it('Should return the HTTP 400 body with every problem', async () => {
    const body = await handler.handle(
      'set-peers',
      mqttRequest(json({ 'hospital-9': false, 'hospital-2': 'off' })),
    );

    expect(body).toEqual({
      message: ['unknown peer hospital-9', 'peer hospital-2 takes a boolean'],
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it.each([[[]], ['on'], [null]])(
    'Should refuse a body that is not an object, such as %j',
    async (value) => {
      const body = await handler.handle('set-peers', mqttRequest(json(value)));

      expect(body).toEqual({
        message: 'Validation Failed',
        error: 'Bad Request',
        statusCode: 400,
      });
    },
  );
});
