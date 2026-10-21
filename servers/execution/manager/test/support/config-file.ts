import { afterEach, beforeEach } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const baseEnv = { ...process.env };

/**
 * Runs each test of the calling describe block without
 * EXECUTION_MANAGER_CONFIG_PATH and the given variables. Returns a function
 * that writes the configuration file and points EXECUTION_MANAGER_CONFIG_PATH
 * at it.
 */
export function useConfigFile(
  variables: string[],
): (content: string) => Promise<string> {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-manager-config-'));
    process.env = { ...baseEnv };
    delete process.env.EXECUTION_MANAGER_CONFIG_PATH;
    variables.forEach((name) => delete process.env[name]);
  });

  afterEach(async () => {
    process.env = { ...baseEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  return async (content) => {
    const configPath = path.join(tempDir, 'execution-manager.yaml');
    await writeFile(configPath, content, 'utf8');
    process.env.EXECUTION_MANAGER_CONFIG_PATH = configPath;
    return configPath;
  };
}
