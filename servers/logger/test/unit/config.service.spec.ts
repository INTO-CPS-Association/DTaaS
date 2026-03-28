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
    delete process.env.LOGGER_JWT;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
  });

  afterEach(async () => {
    process.env = { ...baseEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config is provided', () => {
    const config = new Config();

    expect(config.getHostname()).toBe('0.0.0.0');
    expect(config.getPort()).toBe(4003);
    expect(config.getJwt()).toBe('');
    expect(config.getTls()).toBe(false);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'certs'),
    );
    expect(config.getLogFilePath()).toBe(
      path.resolve(process.cwd(), 'logs/workflow-logs.jsonl'),
    );
    expect(config.getMaxPayloadBytes()).toBe(64 * 1024);
  });

  it('loads yaml config with relative paths', async () => {
    const configPath = path.join(tempDir, 'logger.yaml');
    await writeFile(
      configPath,
      [
        'hostname: 127.0.0.1',
        'port: 4500',
        'jwt: test-token',
        'tls: true',
        'certs: ./secure-certs',
        'log-file-path: ./data/events.jsonl',
        'max-payload-bytes: 120000',
      ].join('\n'),
      'utf8',
    );

    process.env.LOGGER_CONFIG_PATH = configPath;
    const config = new Config();

    expect(config.getHostname()).toBe('127.0.0.1');
    expect(config.getPort()).toBe(4500);
    expect(config.getJwt()).toBe('test-token');
    expect(config.getTls()).toBe(true);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(tempDir, 'secure-certs'),
    );
    expect(config.getLogFilePath()).toBe(
      path.resolve(tempDir, 'data/events.jsonl'),
    );
    expect(config.getMaxPayloadBytes()).toBe(120000);
  });

  it('uses env vars to override yaml values', async () => {
    const configPath = path.join(tempDir, 'logger.yaml');
    await writeFile(
      configPath,
      [
        'hostname: 127.0.0.1',
        'port: 4500',
        'jwt: token-from-yaml',
        'tls: false',
        'certs: ./secure-certs',
      ].join('\n'),
      'utf8',
    );

    process.env.LOGGER_CONFIG_PATH = configPath;
    process.env.LOGGER_HOSTNAME = '0.0.0.0';
    process.env.LOGGER_PORT = '4900';
    process.env.LOGGER_JWT = 'token-from-env';
    process.env.LOGGER_TLS = 'true';
    process.env.LOGGER_CERTS_DIR = './runtime-certs';
    process.env.LOGGER_LOG_FILE_PATH = './runtime-logs/events.jsonl';
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '50000';

    const config = new Config();

    expect(config.getHostname()).toBe('0.0.0.0');
    expect(config.getPort()).toBe(4900);
    expect(config.getJwt()).toBe('token-from-env');
    expect(config.getTls()).toBe(true);
    expect(config.getCertsDirectory()).toBe(
      path.resolve(process.cwd(), 'runtime-certs'),
    );
    expect(config.getLogFilePath()).toBe(
      path.resolve(process.cwd(), 'runtime-logs/events.jsonl'),
    );
    expect(config.getMaxPayloadBytes()).toBe(50000);
  });
});
