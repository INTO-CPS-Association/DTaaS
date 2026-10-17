import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { IPublishPacket, MqttClient } from 'mqtt';
import Keyv from 'keyv';
import AppModule from 'src/app.module';
import Config from 'src/config/configuration.service';
import MqttService from 'src/mqtt/mqtt.service';
import { MqttConfig } from 'src/mqtt/mqtt.config';
import { configFilename } from 'test/utils';

// Starts the runner with the test configuration and the given MQTT
// settings, and connects it to the broker
export async function startRunner(mqtt: MqttConfig): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication({ logger: false });
  const config = app.get<Config>(Config);
  const options = new Keyv();
  await options.set('configFile', configFilename);
  await config.loadConfig(options);
  jest.spyOn(config, 'getMqtt').mockReturnValue(mqtt);
  await app.init();
  app.get<MqttService>(MqttService).start();
  return app;
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
        body: JSON.parse(payload.toString()),
        correlationData: received,
      });
    };
    client.on('message', listener);
  });
}
