import { existsSync } from 'node:fs';
import path from 'node:path';
import { nonBlank } from './parsers.js';

export const CONFIG_PATH_VARIABLE = 'EXECUTION_MANAGER_CONFIG_PATH';
const CONFIG_FLAG = '--config';
const CONFIG_SHORT_FLAG = '-c';
const DEFAULT_CONFIG_FILE = 'execution-manager.yaml';

function parseConfigFromArgs(argv: ReadonlyArray<string>): string | undefined {
  let configPath: string | undefined;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === CONFIG_SHORT_FLAG || arg === CONFIG_FLAG) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new Error(`${arg} requires a file path`);
      }
      configPath = value;
      i += 1;
      continue;
    }
    if (arg.startsWith(`${CONFIG_FLAG}=`)) {
      const value = arg.slice(`${CONFIG_FLAG}=`.length);
      if (nonBlank(value) === undefined) {
        throw new Error(`${CONFIG_FLAG} requires a file path`);
      }
      configPath = value;
    }
  }
  return configPath;
}

export default function resolveConfigPath(
  argv: ReadonlyArray<string>,
): string | undefined {
  const fromCli = parseConfigFromArgs(argv);
  const fromEnv = nonBlank(process.env[CONFIG_PATH_VARIABLE]);
  const selected = fromCli ?? fromEnv ?? DEFAULT_CONFIG_FILE;
  const resolvedPath = path.resolve(selected);

  if (existsSync(resolvedPath)) {
    return resolvedPath;
  }
  if (fromCli !== undefined || fromEnv !== undefined) {
    throw new Error(
      `Execution manager config file does not exist: ${resolvedPath}`,
    );
  }
  return undefined;
}
