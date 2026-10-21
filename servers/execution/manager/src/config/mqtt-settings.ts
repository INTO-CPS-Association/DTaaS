import { z } from 'zod';

export const mqttSettingsSchema = z
  .object({
    url: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
    password: z.string().min(1).optional(),
    'topic-prefix': z.string().trim().min(1).optional(),
  })
  .strict();

export type MqttSection = z.infer<typeof mqttSettingsSchema>;

export type MqttSettings = MqttSection & {
  url: string;
  'topic-prefix': string;
};

export const MQTT_ENV_VARIABLES = {
  url: 'EXECUTION_MANAGER_MQTT_URL',
  username: 'EXECUTION_MANAGER_MQTT_USERNAME',
  password: 'EXECUTION_MANAGER_MQTT_PASSWORD',
  'topic-prefix': 'EXECUTION_MANAGER_MQTT_TOPIC_PREFIX',
} as const satisfies Record<keyof MqttSection, string>;

const DEFAULT_MQTT_URL = 'mqtt://localhost:1883';
const DEFAULT_MQTT_TOPIC_PREFIX = 'dtaas/execution-manager';

export function withMqttDefaults(section: MqttSection): MqttSettings {
  return {
    ...section,
    url: section.url ?? DEFAULT_MQTT_URL,
    'topic-prefix': section['topic-prefix'] ?? DEFAULT_MQTT_TOPIC_PREFIX,
  };
}
