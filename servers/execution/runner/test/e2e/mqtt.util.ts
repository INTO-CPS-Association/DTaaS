import { once } from 'node:events';
import { AddressInfo, createServer, Server } from 'node:net';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Aedes } from 'aedes';
import { connectAsync, IPublishPacket, MqttClient } from 'mqtt';
import Keyv from 'keyv';
import AppModule from 'src/app.module';
import Config from 'src/config/configuration.service';
import { NotificationDto } from 'src/dto/notify.dto';
import { StateDocumentDto } from 'src/dto/state.dto';
import MqttService from 'src/mqtt/mqtt.service';
import { MqttConfig } from 'src/mqtt/mqtt.config';
import { configFilename } from 'test/utils';
import { unwrap } from './jws.util';

// Starts the runner with the test configuration and, if given, the MQTT
// settings, connected to the broker; prepare may spy on more of the
// configuration
export async function startRunner(
  mqtt?: MqttConfig,
  prepare?: (config: Config) => void,
): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication({ logger: false });
  const config = app.get<Config>(Config);
  const options = new Keyv();
  await options.set('configFile', configFilename);
  await config.loadConfig(options);
  if (mqtt !== undefined) {
    jest.spyOn(config, 'getMqtt').mockReturnValue(mqtt);
  }
  prepare?.(config);
  // start does nothing without an MQTT configuration. It comes before
  // init, as in main.ts, so that the startup notification is published.
  app.get<MqttService>(MqttService).start();
  await app.init();
  return app;
}

export type Broker = { aedes: Aedes; server: Server; url: string };

// A local aedes broker, which supports MQTT 3.1.1 only
export async function startBroker(): Promise<Broker> {
  const aedes = await Aedes.createBroker();
  const server = createServer(aedes.handle);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return { aedes, server, url: `mqtt://127.0.0.1:${port}` };
}

export async function stopBroker({ aedes, server }: Broker): Promise<void> {
  await new Promise<void>((resolve) => {
    aedes.close(() => resolve());
  });
  server.close();
  await once(server, 'close');
}

export type Reply = {
  topic: string;
  body: unknown;
  correlationData?: string;
};

// Resolves with the next message on the topic, and with the correlation
// data if one is given, ignoring other messages
export function nextReply(
  client: MqttClient,
  topic: string,
  correlationData?: string,
): Promise<Reply> {
  return new Promise((resolve) => {
    const listener = (
      replyTopic: string,
      payload: Buffer,
      packet: IPublishPacket,
    ) => {
      const received = packet.properties?.correlationData?.toString();
      if (replyTopic !== topic || (correlationData ?? received) !== received) {
        return;
      }
      client.removeListener('message', listener);
      resolve({
        topic: replyTopic,
        body: unwrap(payload.toString()),
        correlationData: received,
      });
    };
    client.on('message', listener);
  });
}

export type Notification = {
  body: NotificationDto;
  retain: boolean;
  raw: string;
};

// Resolves with the next notification on the topic whose data, by
// default a state document, passes the check, whether the broker
// retained it, and the payload as received, plain JSON or a JWS
export function nextNotification<Data = StateDocumentDto>(
  client: MqttClient,
  topic: string,
  check: (data: Data) => boolean,
): Promise<Notification> {
  return new Promise((resolve) => {
    const listener = (
      notifyTopic: string,
      payload: Buffer,
      { retain }: IPublishPacket,
    ) => {
      // an empty payload deletes a retained message
      if (notifyTopic !== topic || payload.length === 0) {
        return;
      }
      const raw = payload.toString();
      const body = unwrap(raw) as NotificationDto;
      if (check(body.data as Data)) {
        client.removeListener('message', listener);
        resolve({ body, retain, raw });
      }
    };
    client.on('message', listener);
  });
}

// Connects a new client and resolves with the first notification it
// receives on the topic, the one that the broker retained
export async function lateSubscriber(
  url: string,
  protocolVersion: 4 | 5,
  topic: string,
): Promise<Notification> {
  const late = await connectAsync(url, { protocolVersion });
  try {
    const notification = nextNotification(late, topic, () => true);
    await late.subscribeAsync(topic, { qos: 1 });
    return await notification;
  } finally {
    await late.endAsync();
  }
}
