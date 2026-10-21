import { type AddressInfo, type Server, createServer } from 'node:net';
import { Aedes } from 'aedes';
import mqtt, { type IPublishPacket, type MqttClient } from 'mqtt';
import type { MqttConnect } from 'src/mqtt/mqtt.service.js';

export const neverConnect: MqttConnect = () => {
  const client = {
    on: () => client,
    publishAsync: () => Promise.resolve(),
    endAsync: () => Promise.resolve(),
  };
  return client as unknown as MqttClient;
};

export type Broker = {
  aedes: Aedes;
  port: number;
  url: string;
  stop(): Promise<void>;
};

export async function startBroker(port = 0): Promise<Broker> {
  const aedes = await Aedes.createBroker();
  const server: Server = createServer(aedes.handle);
  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', resolve);
  });
  const listening = (server.address() as AddressInfo).port;
  return {
    aedes,
    port: listening,
    url: `mqtt://127.0.0.1:${listening}`,
    stop: () =>
      new Promise<void>((resolve) => {
        aedes.close(() => server.close(() => resolve()));
      }),
  };
}

export function subscribed(broker: Broker, filter: string): Promise<void> {
  return new Promise((resolve) => {
    broker.aedes.on('subscribe', (subscriptions) => {
      if (subscriptions.some((subscription) => subscription.topic === filter)) {
        resolve();
      }
    });
  });
}

export function connectClient(url: string): Promise<MqttClient> {
  const client = mqtt.connect(url);
  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve(client));
    client.once('error', reject);
  });
}

export type Received = { body: unknown; qos: number; retain: boolean };

export async function nextMessage(
  client: MqttClient,
  topic: string,
): Promise<Received> {
  await client.subscribeAsync(topic, { qos: 1 });
  return new Promise((resolve) => {
    const onMessage = (
      received: string,
      payload: Buffer,
      packet: IPublishPacket,
    ) => {
      if (received !== topic) return;
      client.off('message', onMessage);
      resolve({
        body: JSON.parse(payload.toString()),
        qos: packet.qos,
        retain: packet.retain,
      });
    };
    client.on('message', onMessage);
  });
}
