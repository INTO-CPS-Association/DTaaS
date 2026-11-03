import { existsSync } from 'node:fs';
import resolveFile from './util.js';

const CONFIG_FLAG = '--config';
const CONFIG_SHORT_FLAG = '-c';
const DEFAULT_CONFIG_FILE = 'signals.yaml';

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
      if (value.trim() === '') {
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
  const fromEnvRaw = process.env.SIGNALS_CONFIG_PATH;
  const fromEnv =
    fromEnvRaw !== undefined && fromEnvRaw.trim() !== ''
      ? fromEnvRaw.trim()
      : undefined;
  const selected = fromCli ?? fromEnv ?? DEFAULT_CONFIG_FILE;
  const resolvedPath = resolveFile(selected);

  if (existsSync(resolvedPath)) {
    return resolvedPath;
  }
  if (fromCli !== undefined || fromEnv !== undefined) {
    throw new Error(`Signals config file does not exist: ${resolvedPath}`);
  }
  return undefined;
}
