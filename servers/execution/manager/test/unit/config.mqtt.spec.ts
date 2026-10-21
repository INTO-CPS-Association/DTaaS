import { describe, expect, it } from '@jest/globals';
import Config from 'src/config/config.service.js';
import { MQTT_ENV_VARIABLES } from 'src/config/mqtt-settings.js';
import { useConfigFile } from '../support/config-file.js';

const mqttEnvVariables = Object.values(MQTT_ENV_VARIABLES);

describe('Config service MQTT section', () => {
  const writeConfig = useConfigFile(mqttEnvVariables);

  async function useYaml(lines: string[]): Promise<void> {
    await writeConfig(`${lines.join('\n')}\n`);
  }

  it('uses the defaults for an absent section', () => {
    expect(new Config().getMqtt()).toEqual({
      url: 'mqtt://localhost:1883',
      'topic-prefix': 'dtaas/execution-manager',
    });
  });

  it('loads the section from yaml as it is written', async () => {
    await useYaml([
      'mqtt:',
      '  url: mqtt://broker.example.org:1883',
      '  username: manager',
      '  password: "s3cret "',
      '  topic-prefix: /dtaas/manager/',
    ]);

    expect(new Config().getMqtt()).toEqual({
      url: 'mqtt://broker.example.org:1883',
      username: 'manager',
      password: 's3cret ',
      'topic-prefix': '/dtaas/manager/',
    });
  });

  it('uses env vars to override the yaml settings', async () => {
    await useYaml(['mqtt:', '  url: mqtt://broker.example.org:1883']);
    process.env.EXECUTION_MANAGER_MQTT_URL = ' mqtts://broker.local:8883 ';
    process.env.EXECUTION_MANAGER_MQTT_USERNAME = 'env-user';
    process.env.EXECUTION_MANAGER_MQTT_PASSWORD = 'env-pass ';
    process.env.EXECUTION_MANAGER_MQTT_TOPIC_PREFIX = 'test/prefix';

    expect(new Config().getMqtt()).toEqual({
      url: 'mqtts://broker.local:8883',
      username: 'env-user',
      password: 'env-pass ',
      'topic-prefix': 'test/prefix',
    });
  });

  it('ignores blank env overrides', async () => {
    await useYaml(['mqtt:', '  username: manager']);
    mqttEnvVariables.forEach((name) => {
      process.env[name] = '  ';
    });

    expect(new Config().getMqtt()).toEqual({
      url: 'mqtt://localhost:1883',
      username: 'manager',
      'topic-prefix': 'dtaas/execution-manager',
    });
  });

  it('rejects an unknown yaml setting', async () => {
    await useYaml(['mqtt:', '  port: 1883']);

    expect(() => new Config()).toThrow();
  });

  it('returns a copy of the section', () => {
    const config = new Config();
    config.getMqtt().url = 'mqtt://changed';

    expect(config.getMqtt().url).toBe('mqtt://localhost:1883');
  });
});
