import type { MqttSettings } from '../config/mqtt-settings.js';
import { trimSlashes } from '../config/parsers.js';
import { isTopicName } from './topics.js';

export type ResolvedMqttSettings = {
  url: string;
  username?: string;
  password?: string;
  baseTopic: string;
};

export const MQTT_SETTINGS = Symbol('MQTT_SETTINGS');

export function resolveMqttSettings(
  settings: MqttSettings,
  gitlabUsername: string,
): ResolvedMqttSettings {
  const prefix = trimSlashes(settings['topic-prefix']);
  const baseTopic = `${prefix}/${gitlabUsername}`;
  if (!isTopicName(baseTopic)) {
    throw new Error(
      `mqtt.topic-prefix and gitlab.username do not form an MQTT topic name: ${JSON.stringify(baseTopic)}`,
    );
  }
  return {
    url: settings.url,
    username: settings.username,
    password: settings.password,
    baseTopic,
  };
}
