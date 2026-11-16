import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import type { IPublishPacket, MqttClient } from 'mqtt';
import Access from 'src/auth/access';
import Signer from 'src/auth/signer';
import Config from 'src/config/configuration.service';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import { MqttRequest, parseJson } from 'src/mqtt/mqtt-request';
import MqttService, { MqttConnect } from 'src/mqtt/mqtt.service';
import { MqttConfig } from 'src/mqtt/mqtt.config';
import { HistoryQuery } from 'src/dto/history.dto';
import { CommandOptions } from 'src/interfaces/command.interface';
import { RunOutcome } from 'src/interfaces/runner.interface';

// An MQTT client that records its calls, for the MQTT service tests
export class FakeClient extends EventEmitter {
  connected = false;

  subscribe = jest.fn();

  unsubscribe = jest.fn();

  publishAsync = jest.fn(
    (_topic: string, _message: string, _options: unknown) =>
      Promise.resolve(undefined),
  );

  endAsync = jest.fn((_force?: boolean) => Promise.resolve(undefined));

  stream = { destroy: jest.fn() };
}

export const mqttConfig: MqttConfig = {
  url: 'mqtt://user:secret@localhost:1883',
  topic: 'dtaas/runner',
  username: 'user',
  password: 'secret',
  protocolVersion: 5,
};

// Encodes plain JSON, as without auth.key
export const unsigned = new Signer(undefined, 'hospital-1');

// The service with a fake client and handler, and access control and a
// signing key if given
export function setup(
  options: MqttConfig | undefined,
  access?: Access,
  signer = unsigned,
) {
  const client = new FakeClient();
  const connect = jest.fn<MqttConnect>(() => client as unknown as MqttClient);
  const config = {
    getMqtt: () => options,
    getId: () => 'hospital-1',
    access: () => access,
    getSigner: () => signer,
  } as unknown as Config;
  const handle = jest.fn(
    (_route: string, _request: MqttRequest): Promise<unknown> =>
      Promise.resolve({ status: 'success' }),
  );
  const handler = { handle } as unknown as MqttRequestHandler;
  const service = new MqttService(config, handler, connect);
  return { client, connect, handle, service };
}

export const packet = (properties?: IPublishPacket['properties']) =>
  ({ properties }) as IPublishPacket;

// The request that a plain payload makes without access control
export const mqttRequest = (
  payload: Buffer,
  requestKey?: string,
): MqttRequest => ({ body: parseJson(payload), requestKey });

// The service answers asynchronously, so wait for the reply to go out.
// A received packet carries its topic, as in mqtt.js.
export const message = async (
  client: FakeClient,
  topic: string,
  payload: Buffer,
  received: IPublishPacket,
) => {
  client.emit('message', topic, payload, { ...received, topic });
  await new Promise(setImmediate);
};

export const status = {
  name: 'create',
  status: 'valid',
  logs: { stdout: 'hello world', stderr: '' },
  exitCode: 0,
};

export const historyEntry = {
  id: 1,
  name: 'create',
  status: 'valid',
  exitCode: 0,
  receivedAt: '2026-10-25T10:00:00.000Z',
  finishedAt: '2026-10-25T10:00:01.000Z',
  by: null,
};

// An ExecaManager whose commands all end with the outcome, for the
// MQTT request handler tests
export const fakeManager = (outcome: RunOutcome) => ({
  newCommand: jest.fn(
    (_name: string, _requestKey?: string, _options?: CommandOptions) =>
      Promise.resolve([outcome, new Map(), null]),
  ),
  checkStatus: jest.fn(() => status),
  checkHistory: jest.fn((_query?: HistoryQuery) => [historyEntry]),
  databaseMode: jest.fn(() => 'file'),
  scriptsHealth: jest.fn(() => null),
  stop: jest.fn((_name?: string) => Promise.resolve(['create'])),
});

export const dt = {
  id: 'hospital-1',
  attributes: { city: 'Aarhus' },
  commands: ['create'],
  stateMachine: true,
  manager: { commands: [] },
  publicKey: null,
};

export const stateDocument = {
  id: 'hospital-1',
  time: '2026-10-25T10:00:00.000Z',
  machine: null,
  parameters: {},
  command: null,
};

export const metricsDocument = {
  since: '2026-10-25T09:59:00.000Z',
  uptime: 60,
  commands: {
    valid: 1,
    failed: 0,
    stopped: 0,
    invalid: 0,
    interrupted: 0,
    running: 0,
  },
  machine: null,
  escalations: { request: 0, failure: 0, 'no-transition': 0 },
};

// A DescriptorService, for the MQTT request handler tests
export const fakeDescriptor = () => ({
  describe: jest.fn(() => dt),
  state: jest.fn(() => stateDocument),
  metrics: jest.fn(() => metricsDocument),
});
