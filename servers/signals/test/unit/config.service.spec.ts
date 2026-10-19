import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Config from 'src/config/config.service';
import { CONFIG_KEYS, envNameOf } from 'src/config/schema';

const originalEnv = { ...process.env };

describe('Config', () => {
  let tempDir = '';

  async function yamlFile(text: string): Promise<string> {
    const filePath = path.join(tempDir, 'signals.yaml');
    await writeFile(filePath, text, 'utf8');
    return filePath;
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-config-'));
    process.env = { ...originalEnv };
    CONFIG_KEYS.forEach((key) => delete process.env[envNameOf(key)]);
    delete process.env.SIGNALS_CONFIG_PATH;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('starts from the documented defaults', () => {
    const config = new Config();
    expect(config.get('port')).toBe(4004);
    expect(config.get('gitlab-group')).toBe('DTaaS');
    expect(config.get('gitlab-branch')).toBe('master');
    expect(config.get('vhost-template')).toBe('{owner}');
    expect(config.get('cors-allow-origin')).toBe('');
    expect(config.get('max-streams-per-user')).toBe(4);
    expect(config.get('range-max-points')).toBe(10_000);
  });

  it('reads YAML and resolves file keys against its folder', async () => {
    const filePath = await yamlFile(
      'gitlab-url: https://gitlab.example.org/gitlab\nrabbitmq-password-file: secrets/rabbitmq\n',
    );
    const config = new Config();
    config.loadConfig(filePath);
    expect(config.get('gitlab-url')).toBe('https://gitlab.example.org/gitlab');
    expect(config.get('rabbitmq-password-file')).toBe(
      path.join(tempDir, 'secrets/rabbitmq'),
    );
  });

  it('lets SIGNALS_* variables override the YAML', async () => {
    const filePath = await yamlFile('port: 4100\n');
    process.env.SIGNALS_PORT = '4200';
    process.env.SIGNALS_INFLUX_TOKENS_FILE = 'tokens.json';
    const config = new Config();
    config.loadConfig(filePath);
    expect(config.get('port')).toBe(4200);
    expect(config.get('influx-tokens-file')).toBe(path.resolve('tokens.json'));
  });

  it('reads booleans written as words', () => {
    process.env.SIGNALS_CORS_ALLOW_CREDENTIALS = 'yes';
    expect(new Config().get('cors-allow-credentials')).toBe(true);
    process.env.SIGNALS_CORS_ALLOW_CREDENTIALS = 'No';
    expect(new Config().get('cors-allow-credentials')).toBe(false);
    process.env.SIGNALS_CORS_ALLOW_CREDENTIALS = 'perhaps';
    expect(() => new Config()).toThrow();
  });

  it('refuses a plain RabbitMQ password in YAML', async () => {
    const filePath = await yamlFile('rabbitmq-password: hunter2\n');
    expect(() => new Config().loadConfig(filePath)).toThrow(
      /rabbitmq-password-file/,
    );
  });

  it('refuses an inline InfluxDB token in YAML', async () => {
    const filePath = await yamlFile('influx-token: abc\n');
    expect(() => new Config().loadConfig(filePath)).toThrow(
      /influx-tokens-file/,
    );
  });

  it('refuses a plain password in the environment', () => {
    process.env.SIGNALS_RABBITMQ_PASSWORD = 'hunter2';
    expect(() => new Config()).toThrow(/SIGNALS_RABBITMQ_PASSWORD is refused/);
  });

  it('refuses credentials inside rabbitmq-url', async () => {
    const filePath = await yamlFile(
      'rabbitmq-url: amqp://user:secret@broker:5672\n',
    );
    expect(() => new Config().loadConfig(filePath)).toThrow(
      /must not carry credentials/,
    );
  });

  it('refuses unknown keys and a URL of the wrong scheme', async () => {
    expect(() => new Config().loadConfig(`${tempDir}/missing.yaml`)).toThrow();
    const unknown = await yamlFile('no-such-key: 1\n');
    expect(() => new Config().loadConfig(unknown)).toThrow();
    const wrongScheme = await yamlFile(
      'gitlab-url: ftp://gitlab.example.org\n',
    );
    expect(() => new Config().loadConfig(wrongScheme)).toThrow();
  });

  it('accepts an empty YAML file and refuses a list', async () => {
    expect(new Config().loadConfig(await yamlFile(''))).toBeUndefined();
    const list = await yamlFile('- a\n- b\n');
    expect(() => new Config().loadConfig(list)).toThrow(/mapping/);
  });
});

describe('config/signals.yaml.sample', () => {
  const samplePath = path.resolve('config/signals.yaml.sample');

  it('loads, and documents every key', async () => {
    CONFIG_KEYS.forEach((key) => delete process.env[envNameOf(key)]);
    const config = new Config();
    expect(() => config.loadConfig(samplePath)).not.toThrow();
    const text = await readFile(samplePath, 'utf8');
    CONFIG_KEYS.forEach((key) => expect(text).toContain(`\n${key}:`));
  });
});
