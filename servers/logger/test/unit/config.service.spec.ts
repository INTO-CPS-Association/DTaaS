import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Config from 'src/config/config.service';

const baseEnv = { ...process.env };

describe('Config service', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-config-'));
    process.env = { ...baseEnv };
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_HOSTNAME;
    delete process.env.LOGGER_PORT;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_CORS_ALLOW_CREDENTIALS;
    delete process.env.LOGGER_AUTH_TOKEN;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    delete process.env.LOGGER_THROTTLE_TTL;
    delete process.env.LOGGER_THROTTLE_LIMIT;
  });

  afterEach(async () => {
    process.env = { ...baseEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config is provided', () => {
    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4003);
    expect(config.getCorsAllowOrigin()).toBe('');
    expect(config.getCorsAllowCredentials()).toBe(false);
    expect(config.getAuthToken()).toBe('');
    expect(config.getTls()).toBe(false);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'certs'),
    );
    expect(config.getLogFilePath()).toBe(
      path.resolve(process.cwd(), 'logs/workflow-logs.jsonl'),
    );
    expect(config.getMaxPayloadBytes()).toBe(64 * 1024);
    expect(config.getThrottleTtl()).toBe(60_000);
    expect(config.getThrottleLimit()).toBe(120);
  });

  it('loads yaml config with relative paths', async () => {
    const configPath = path.join(tempDir, 'logger.yaml');
    await writeFile(
      configPath,
      [
        'hostname: 127.0.0.1',
        'port: 4500',
        'cors-allow-origin: https://client.example',
        'cors-allow-credentials: true',
        'auth-token: test-token',
        'tls: true',
        'certs: ./secure-certs',
        'log-file-path: ./data/events.jsonl',
        'max-payload-bytes: 120000',
        'throttle-ttl: 30000',
        'throttle-limit: 600',
      ].join('\n'),
      'utf8',
    );

    process.env.LOGGER_CONFIG_PATH = configPath;
    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4500);
    expect(config.getCorsAllowOrigin()).toBe('https://client.example');
    expect(config.getCorsAllowCredentials()).toBe(true);
    expect(config.getAuthToken()).toBe('test-token');
    expect(config.getTls()).toBe(true);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(tempDir, 'secure-certs'),
    );
    expect(config.getLogFilePath()).toBe(
      path.resolve(tempDir, 'data/events.jsonl'),
    );
    expect(config.getMaxPayloadBytes()).toBe(120000);
    expect(config.getThrottleTtl()).toBe(30000);
    expect(config.getThrottleLimit()).toBe(600);
  });

  it('uses env vars to override yaml values', async () => {
    const configPath = path.join(tempDir, 'logger.yaml');
    await writeFile(
      configPath,
      [
        'hostname: 127.0.0.1',
        'port: 4500',
        'auth-token: token-from-yaml',
        'tls: false',
        'certs: ./secure-certs',
      ].join('\n'),
      'utf8',
    );

    process.env.LOGGER_CONFIG_PATH = configPath;
    process.env.LOGGER_HOSTNAME = '0.0.0.0';
    process.env.LOGGER_PORT = '4900';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = 'http://frontend.local:3000';
    process.env.LOGGER_CORS_ALLOW_CREDENTIALS = 'true';
    process.env.LOGGER_AUTH_TOKEN = 'token-from-env';
    process.env.LOGGER_TLS = 'true';
    process.env.LOGGER_CERTS_DIR = './runtime-certs';
    process.env.LOGGER_LOG_FILE_PATH = './runtime-logs/events.jsonl';
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '50000';
    process.env.LOGGER_THROTTLE_TTL = '45000';
    process.env.LOGGER_THROTTLE_LIMIT = '900';

    const config = new Config();

    expect(config.getHostname()).toBe('0.0.0.0');
    expect(config.getPort()).toBe(4900);
    expect(config.getCorsAllowOrigin()).toBe('http://frontend.local:3000');
    expect(config.getCorsAllowCredentials()).toBe(true);
    expect(config.getAuthToken()).toBe('token-from-env');
    expect(config.getTls()).toBe(true);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'runtime-certs'),
    );
    expect(config.getLogFilePath()).toBe(
      path.resolve(process.cwd(), 'runtime-logs/events.jsonl'),
    );
    expect(config.getMaxPayloadBytes()).toBe(50000);
    expect(config.getThrottleTtl()).toBe(45000);
    expect(config.getThrottleLimit()).toBe(900);
  });

  it('loads multiple yaml cors origins', async () => {
    const configPath = path.join(tempDir, 'logger.yaml');
    await writeFile(
      configPath,
      [
        'cors-allow-origin:',
        '  - https://client-a.example.org',
        '  - https://client-b.example.org',
        '  - https://client-c.example.org',
      ].join('\n'),
      'utf8',
    );

    process.env.LOGGER_CONFIG_PATH = configPath;
    const config = new Config();

    expect(config.getCorsAllowOrigin()).toEqual([
      'https://client-a.example.org',
      'https://client-b.example.org',
      'https://client-c.example.org',
    ]);
  });

  it('parses shorthand boolean env values', () => {
    process.env.LOGGER_TLS = 'y';
    expect(new Config().getTls()).toBe(true);

    process.env.LOGGER_TLS = 'n';
    expect(new Config().getTls()).toBe(false);
  });

  it('ignores blank env overrides', () => {
    process.env.LOGGER_CONFIG_PATH = '';
    process.env.LOGGER_HOSTNAME = '   ';
    process.env.LOGGER_PORT = '';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = '   ';
    process.env.LOGGER_CORS_ALLOW_CREDENTIALS = '';
    process.env.LOGGER_TLS = '';
    process.env.LOGGER_CERTS_DIR = '';
    process.env.LOGGER_LOG_FILE_PATH = '   ';
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '';
    process.env.LOGGER_THROTTLE_TTL = '';
    process.env.LOGGER_THROTTLE_LIMIT = '';

    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4003);
    expect(config.getCorsAllowOrigin()).toBe('');
    expect(config.getCorsAllowCredentials()).toBe(false);
    expect(config.getTls()).toBe(false);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'certs'),
    );
    expect(config.getLogFilePath()).toBe(
      path.resolve(process.cwd(), 'logs/workflow-logs.jsonl'),
    );
    expect(config.getMaxPayloadBytes()).toBe(64 * 1024);
    expect(config.getThrottleTtl()).toBe(60_000);
    expect(config.getThrottleLimit()).toBe(120);
  });

  it('throws when a boolean env value is invalid', () => {
    process.env.LOGGER_TLS = 'maybe';

    expect(() => new Config()).toThrow(
      'LOGGER_TLS must be a boolean value (true/false, yes/no, 1/0)',
    );
  });

  it('throws when a numeric env value is not a number', () => {
    process.env.LOGGER_PORT = 'not-a-number';

    expect(() => new Config()).toThrow(
      'LOGGER_PORT must be a positive integer',
    );
  });

  it('throws when a numeric env value is not positive', () => {
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '0';

    expect(() => new Config()).toThrow(
      'LOGGER_MAX_PAYLOAD_BYTES must be a positive integer',
    );
  });

  it('treats an empty yaml config as defaults', async () => {
    const configPath = path.join(tempDir, 'logger.yaml');
    await writeFile(configPath, '', 'utf8');

    process.env.LOGGER_CONFIG_PATH = configPath;
    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4003);
    expect(config.getCorsAllowOrigin()).toBe('');
  });

  it('throws when yaml tls is not a boolean', async () => {
    const configPath = path.join(tempDir, 'logger.yaml');
    await writeFile(configPath, 'tls: 2\n', 'utf8');

    process.env.LOGGER_CONFIG_PATH = configPath;

    expect(() => new Config()).toThrow();
  });

  it('keeps a custom yaml cors origin when loading an explicit path with an env port', async () => {
    const configPath = path.join(tempDir, 'custom-logger.yaml');
    await writeFile(
      configPath,
      ['port: 4500', 'cors-allow-origin: https://custom.example'].join('\n'),
      'utf8',
    );
    process.env.LOGGER_PORT = '4900';

    const config = new Config();
    config.loadConfig(configPath);

    expect(config.getPort()).toBe(4900);
    expect(config.getCorsAllowOrigin()).toBe('https://custom.example');
  });
});
