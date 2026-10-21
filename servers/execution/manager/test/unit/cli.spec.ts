import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import resolveConfigPath from 'src/config/cli.js';

const originalEnv = { ...process.env };

describe('Execution manager config path resolution', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-manager-cli-'));
    process.env = { ...originalEnv };
    delete process.env.EXECUTION_MANAGER_CONFIG_PATH;
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it('uses execution-manager.yaml from the working directory when present', async () => {
    const filePath = path.join(tempDir, 'execution-manager.yaml');
    await writeFile(filePath, 'port: 4500\n', 'utf8');
    const previousCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const resolved = resolveConfigPath(['node', 'dist/src/main.js']);
      expect(resolved).toBe(path.resolve(tempDir, 'execution-manager.yaml'));
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('returns undefined when no config file is present', () => {
    const previousCwd = process.cwd();
    process.chdir(tempDir);

    try {
      expect(resolveConfigPath(['node', 'dist/src/main.js'])).toBeUndefined();
    } finally {
      process.chdir(previousCwd);
    }
  });

  it.each(['--config', '-c'])(
    'prefers the %s option and ignores unrelated arguments',
    async (flag) => {
      const filePath = path.join(tempDir, 'custom.yaml');
      await writeFile(filePath, 'port: 4510\n', 'utf8');

      const resolved = resolveConfigPath([
        'node',
        'dist/src/main.js',
        '--verbose',
        flag,
        filePath,
      ]);

      expect(resolved).toBe(path.resolve(filePath));
    },
  );

  it('supports the --config=path syntax', async () => {
    const filePath = path.join(tempDir, 'inline.yaml');
    await writeFile(filePath, 'port: 4520\n', 'utf8');

    const resolved = resolveConfigPath([
      'node',
      'dist/src/main.js',
      `--config=${filePath}`,
    ]);

    expect(resolved).toBe(path.resolve(filePath));
  });

  it('throws when the option has no file path', () => {
    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config']),
    ).toThrow('--config requires a file path');
  });

  it('throws when the option is followed by another flag', () => {
    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config', '--verbose']),
    ).toThrow('--config requires a file path');
  });

  it('throws when the --config=path syntax has an empty value', () => {
    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config=']),
    ).toThrow('--config requires a file path');
  });

  it('throws when the requested config file does not exist', () => {
    const missingPath = path.join(tempDir, 'missing.yaml');

    expect(() =>
      resolveConfigPath(['node', 'dist/src/main.js', '--config', missingPath]),
    ).toThrow('Execution manager config file does not exist');
  });

  it('reads the path from EXECUTION_MANAGER_CONFIG_PATH', async () => {
    const filePath = path.join(tempDir, 'env.yaml');
    await writeFile(filePath, 'port: 4530\n', 'utf8');
    process.env.EXECUTION_MANAGER_CONFIG_PATH = filePath;

    expect(resolveConfigPath(['node', 'dist/src/main.js'])).toBe(
      path.resolve(filePath),
    );
  });
});
