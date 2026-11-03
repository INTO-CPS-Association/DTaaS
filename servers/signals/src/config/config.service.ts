import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  type ConfigKey,
  type ConfigValues,
  FILE_KEYS,
  INLINE_SECRET_KEYS,
  configSchema,
  envNameOf,
} from './schema.js';
import resolveFile from './util.js';

type RawValues = Record<string, unknown>;

function refuseInlineSecrets(values: RawValues, source: string): void {
  const found = Object.keys(INLINE_SECRET_KEYS).find((key) => key in values);
  if (found !== undefined) {
    throw new Error(
      `${source} sets ${found} inline. Put it in a file named by ${INLINE_SECRET_KEYS[found]}`,
    );
  }
}

function refuseCredentialsInUrl(values: ConfigValues): void {
  const url = new URL(values['rabbitmq-url']);
  if (url.username !== '' || url.password !== '') {
    throw new Error(
      'rabbitmq-url must not carry credentials. Use rabbitmq-user and rabbitmq-password-file',
    );
  }
}

function resolveFileKeys(values: RawValues, baseDirectory: string): RawValues {
  const resolved = { ...values };
  for (const key of FILE_KEYS) {
    const value = resolved[key];
    if (typeof value === 'string' && value.trim() !== '') {
      resolved[key] = path.resolve(baseDirectory, value.trim());
    }
  }
  return resolved;
}

function readYaml(configPath: string): RawValues {
  const resolvedPath = resolveFile(configPath);
  const loaded = yaml.load(readFileSync(resolvedPath, 'utf8'));
  if (loaded === undefined || loaded === null) return {};
  if (typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new TypeError(`${resolvedPath} must hold a mapping of keys`);
  }
  refuseInlineSecrets(loaded as RawValues, resolvedPath);
  return resolveFileKeys(loaded as RawValues, path.dirname(resolvedPath));
}

function readEnv(env: NodeJS.ProcessEnv): RawValues {
  const secretNames = Object.keys(INLINE_SECRET_KEYS).map(envNameOf);
  const found = secretNames.find((name) => env[name] !== undefined);
  if (found !== undefined) {
    throw new Error(`${found} is refused. Use the matching *_FILE variable`);
  }
  const values: RawValues = {};
  for (const key of CONFIG_KEYS) {
    const value = env[envNameOf(key)];
    if (value !== undefined && value.trim() !== '') values[key] = value.trim();
  }
  return resolveFileKeys(values, process.cwd());
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
    const values = configSchema.parse({
      ...fromYaml,
      ...readEnv(process.env),
    });
    refuseCredentialsInUrl(values);
    this.values = values;
  }

  get<K extends ConfigKey>(key: K): ConfigValues[K] {
    return this.values[key];
  }
}
