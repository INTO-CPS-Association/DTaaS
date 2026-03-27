import { describe, it, expect, afterEach } from '@jest/globals';
import path from 'node:path';
import Config from 'src/config/config.service';

describe('Config service', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns defaults when env vars are unset', () => {
    delete process.env.LOGGER_PORT;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    const config = new Config();

    expect(config.getPort()).toBe(4003);
    expect(config.getMaxPayloadBytes()).toBe(64 * 1024);
    expect(config.getLogFilePath()).toBe(
      path.resolve(process.cwd(), 'logs/workflow-logs.jsonl'),
    );
  });

  it('returns configured values from env vars', () => {
    process.env.LOGGER_PORT = '4010';
    process.env.LOGGER_LOG_FILE_PATH = './tmp/logger-data.jsonl';
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '8192';
    const config = new Config();

    expect(config.getPort()).toBe(4010);
    expect(config.getMaxPayloadBytes()).toBe(8192);
    expect(config.getLogFilePath()).toBe(
      path.resolve(process.cwd(), 'tmp/logger-data.jsonl'),
    );
  });
});
