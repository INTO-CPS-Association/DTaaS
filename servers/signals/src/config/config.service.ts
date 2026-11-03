import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  type ConfigKey,
  type ConfigValues,
  configSchema,
  envNameOf,
} from './schema.js';

const DEFAULT_CONFIG_FILE = 'signals.yaml';

type RawValues = Record<string, unknown>;

// SIGNALS_CONFIG_PATH names the file and must exist when set. Without it,
// signals.yaml in the working directory is read when present.
function selectConfigPath(configPath?: string): string | undefined {
  const named = configPath ?? process.env.SIGNALS_CONFIG_PATH?.trim();
  if (named !== undefined && named !== '') return path.resolve(named);
  const fallback = path.resolve(DEFAULT_CONFIG_FILE);
  return existsSync(fallback) ? fallback : undefined;
}

function readYaml(configPath: string): RawValues {
  const loaded = yaml.load(readFileSync(configPath, 'utf8'));
  if (loaded === undefined || loaded === null) return {};
  if (typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new TypeError(`${configPath} must hold a mapping of keys`);
  }
  return loaded as RawValues;
}

function readEnv(env: NodeJS.ProcessEnv): RawValues {
  const values: RawValues = {};
  for (const key of CONFIG_KEYS) {
    const value = env[envNameOf(key)];
    if (value !== undefined && value.trim() !== '') values[key] = value.trim();
  }
  return values;
}

@Injectable()
export default class Config {
  private values: ConfigValues = configSchema.parse({});

  constructor() {
    this.loadConfig();
  }

  loadConfig(configPath?: string): void {
    const selected = selectConfigPath(configPath);
    const fromYaml = selected === undefined ? {} : readYaml(selected);
    this.values = configSchema.parse({
      ...fromYaml,
      ...readEnv(process.env),
    });
  }

  get<K extends ConfigKey>(key: K): ConfigValues[K] {
    return this.values[key];
  }
}
