import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import resolveConfigPath from 'src/config/cli';

const originalEnv = { ...process.env };

describe('signals config CLI resolution', () => {
  let tempDir = '';

  beforeEach(async () => {
    // realpath, because macOS reaches its temporary folder through a symlink.
    tempDir = await realpath(
      await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-cli-')),
    );
    process.env = { ...originalEnv };
    delete process.env.SIGNALS_CONFIG_PATH;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('uses default signals.yaml when present', async () => {
    const filePath = path.join(tempDir, 'signals.yaml');
    await writeFile(filePath, 'port: 4700\n', 'utf8');
    const previousCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const resolved = resolveConfigPath(['node', 'dist/src/main.js']);
      expect(resolved).toBe(path.resolve(tempDir, 'signals.yaml'));
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

  it('supports --config=path syntax', async () => {
    const filePath = path.join(tempDir, 'inline.yaml');
    await writeFile(filePath, 'port: 4720\n', 'utf8');

    const resolved = resolveConfigPath([
      'node',
      'dist/src/main.js',
      `--config=${filePath}`,
    ]);
    expect(resolved).toBe(path.resolve(filePath));
  });

  it('supports the -c shorthand and ignores unrelated arguments', async () => {
    const filePath = path.join(tempDir, 'short.yaml');
    await writeFile(filePath, 'port: 4730\n', 'utf8');

    const resolved = resolveConfigPath([
      'node',
      'dist/src/main.js',
      '--verbose',
      '-c',
      filePath,
    ]);
    expect(resolved).toBe(path.resolve(filePath));
  });

  it('throws when --config has no value', () => {
    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config']),
    ).toThrow('--config requires a file path');
  });

  it('throws when the --config value is another flag', () => {
    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config', '--verbose']),
    ).toThrow('--config requires a file path');
  });

  it('throws when --config=path syntax has an empty value', () => {
    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config=']),
    ).toThrow('--config requires a file path');
  });

  it('throws when the --config file does not exist', () => {
    const missingPath = path.join(tempDir, 'missing.yaml');

    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config', missingPath]),
    ).toThrow('Signals config file does not exist');
  });

  it('resolves the config file from SIGNALS_CONFIG_PATH', async () => {
    const filePath = path.join(tempDir, 'env.yaml');
    await writeFile(filePath, 'port: 4740\n', 'utf8');
    process.env.SIGNALS_CONFIG_PATH = filePath;

    const resolved = resolveConfigPath(['node', 'dist/src/main.js']);
    expect(resolved).toBe(path.resolve(filePath));
  });

  it('throws when the SIGNALS_CONFIG_PATH file does not exist', () => {
    process.env.SIGNALS_CONFIG_PATH = path.join(tempDir, 'missing-env.yaml');

    expect(() => resolveConfigPath(['node', 'dist/src/main.js'])).toThrow(
      'Signals config file does not exist',
    );
  });
});
