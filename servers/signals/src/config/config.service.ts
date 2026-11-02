import { readFileSync } from 'node:fs';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  type ConfigKey,
  type ConfigValues,
  configSchema,
  envNameOf,
} from './schema.js';
import resolveFile from './util.js';

type RawValues = Record<string, unknown>;

function readYaml(configPath: string): RawValues {
  const resolvedPath = resolveFile(configPath);
  const loaded = yaml.load(readFileSync(resolvedPath, 'utf8'));
  if (loaded === undefined || loaded === null) return {};
  if (typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new TypeError(`${resolvedPath} must hold a mapping of keys`);
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
    const selected = configPath ?? process.env.SIGNALS_CONFIG_PATH;
    const fromYaml =
      selected !== undefined && selected.trim() !== ''
        ? readYaml(selected)
        : {};
    this.values = configSchema.parse({
      ...fromYaml,
      ...readEnv(process.env),
    });
  }

  get<K extends ConfigKey>(key: K): ConfigValues[K] {
    return this.values[key];
  }
}
