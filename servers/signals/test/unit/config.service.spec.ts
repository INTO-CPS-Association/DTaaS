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
    expect(config.get('hostname')).toBe('127.0.0.1');
    expect(config.get('port')).toBe(4004);
    expect(config.get('cors-allow-origin')).toBe('');
    expect(config.get('throttle-limit')).toBe(120);
  });

  it('reads YAML', async () => {
    const filePath = await yamlFile('port: 4100\nthrottle-limit: 10\n');
    const config = new Config();
    config.loadConfig(filePath);
    expect(config.get('port')).toBe(4100);
    expect(config.get('throttle-limit')).toBe(10);
  });

  it('lets SIGNALS_* variables override the YAML', async () => {
    const filePath = await yamlFile('port: 4100\n');
    process.env.SIGNALS_PORT = '4200';
    const config = new Config();
    config.loadConfig(filePath);
    expect(config.get('port')).toBe(4200);
  });

  it('reads booleans written as words', () => {
    process.env.SIGNALS_CORS_ALLOW_CREDENTIALS = 'yes';
    expect(new Config().get('cors-allow-credentials')).toBe(true);
    process.env.SIGNALS_CORS_ALLOW_CREDENTIALS = 'No';
    expect(new Config().get('cors-allow-credentials')).toBe(false);
    process.env.SIGNALS_CORS_ALLOW_CREDENTIALS = 'perhaps';
    expect(() => new Config()).toThrow();
  });

  it('refuses a missing file, unknown keys and a port that is not a number', async () => {
    expect(() => new Config().loadConfig(`${tempDir}/missing.yaml`)).toThrow();
    const unknown = await yamlFile('no-such-key: 1\n');
    expect(() => new Config().loadConfig(unknown)).toThrow();
    const badPort = await yamlFile('port: http\n');
    expect(() => new Config().loadConfig(badPort)).toThrow();
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
