import { existsSync } from 'node:fs';
import resolveFile from './util.js';

const CONFIG_FLAG = '--config';
const CONFIG_SHORT_FLAG = '-c';
const DEFAULT_CONFIG_FILE = 'logger.yaml';

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
      configPath = arg.slice(`${CONFIG_FLAG}=`.length);
    }
  }
  return configPath;
}

export default function resolveConfigPath(
  argv: ReadonlyArray<string>,
): string | undefined {
  const fromCli = parseConfigFromArgs(argv);
  const fromEnv = process.env.LOGGER_CONFIG_PATH;
  const selected = fromCli ?? fromEnv ?? DEFAULT_CONFIG_FILE;
  const resolvedPath = resolveFile(selected);

  if (existsSync(resolvedPath)) {
    return resolvedPath;
  }
  if (fromCli !== undefined || fromEnv !== undefined) {
    throw new Error(`Logger config file does not exist: ${resolvedPath}`);
  }
  return undefined;
}
