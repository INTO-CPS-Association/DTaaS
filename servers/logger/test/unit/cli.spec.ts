import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import resolveConfigPath from 'src/config/cli';

const originalEnv = { ...process.env };

describe('logger config CLI resolution', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-cli-'));
    process.env = { ...originalEnv };
    delete process.env.LOGGER_CONFIG_PATH;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('uses default logger.yaml when present', async () => {
    const filePath = path.join(tempDir, 'logger.yaml');
    await writeFile(filePath, 'port: 4700\n', 'utf8');
    const previousCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const resolved = resolveConfigPath(['node', 'dist/src/main.js']);
      expect(resolved).toBe(path.resolve(tempDir, 'logger.yaml'));
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('returns undefined when default config is absent', () => {
    const previousCwd = process.cwd();
    process.chdir(tempDir);
    try {
      const resolved = resolveConfigPath(['node', 'dist/src/main.js']);
      expect(resolved).toBeUndefined();
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('prefers explicit --config file', async () => {
    const filePath = path.join(tempDir, 'custom.yaml');
    await writeFile(filePath, 'port: 4710\n', 'utf8');

    const resolved = resolveConfigPath([
      'node',
      'dist/src/main.js',
      '--config',
      filePath,
    ]);
    expect(resolved).toBe(path.resolve(filePath));
  });
});
