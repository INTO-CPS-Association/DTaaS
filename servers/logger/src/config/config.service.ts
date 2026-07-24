import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { type CorsAllowOrigin, IConfig } from './config.interface.js';
import resolveFile from './util.js';

type ConfigValues = {
  hostname: string;
  port: number;
  'cors-allow-origin': CorsAllowOrigin;
  'cors-allow-credentials': boolean;
  'auth-token': string;
  certs: string;
  tls: boolean;
  'log-file-path': string;
  'max-payload-bytes': number;
  'log-max-bytes': number;
  'log-retention-files': number;
  'throttle-ttl': number;
  'throttle-limit': number;
};

const DEFAULT_HOSTNAME = '127.0.0.1';
const DEFAULT_PORT = 4003;
const DEFAULT_AUTH_TOKEN = '';
const DEFAULT_CERTS_DIR = 'certs';
const DEFAULT_LOG_FILE = 'logs/workflow-logs.jsonl';
const DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_CORS_ALLOW_ORIGIN = '';
const DEFAULT_CORS_ALLOW_CREDENTIALS = false;
const DEFAULT_LOG_MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_LOG_RETENTION_FILES = 5;
const DEFAULT_THROTTLE_TTL = 60_000;
const DEFAULT_THROTTLE_LIMIT = 120;

const booleanSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'y'
  ) {
    return true;
  }
  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'no' ||
    normalized === 'n'
  ) {
    return false;
  }
  return value;
}, z.boolean());

const loggerConfigSchema = z
  .object({
    hostname: z.string().trim().min(1).optional(),
    port: z.coerce.number().int().positive().optional(),
    'cors-allow-origin': z
      .union([
        z.string().trim().min(1),
        z.array(z.string().trim().min(1)).min(1),
      ])
      .optional(),
    'cors-allow-credentials': booleanSchema.optional(),
    'auth-token': z.string().optional(),
    certs: z.string().trim().min(1).optional(),
    tls: booleanSchema.optional(),
    'log-file-path': z.string().trim().min(1).optional(),
    'max-payload-bytes': z.coerce.number().int().positive().optional(),
    'log-max-bytes': z.coerce.number().int().positive().optional(),
    'log-retention-files': z.coerce.number().int().positive().optional(),
    'throttle-ttl': z.coerce.number().int().positive().optional(),
    'throttle-limit': z.coerce.number().int().positive().optional(),
  })
  .strict();

function defaultConfigValues(): ConfigValues {
  return {
    hostname: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
    'cors-allow-origin': DEFAULT_CORS_ALLOW_ORIGIN,
    'cors-allow-credentials': DEFAULT_CORS_ALLOW_CREDENTIALS,
    'auth-token': DEFAULT_AUTH_TOKEN,
    certs: path.resolve(process.cwd(), DEFAULT_CERTS_DIR),
    tls: false,
    'log-file-path': path.resolve(process.cwd(), DEFAULT_LOG_FILE),
    'max-payload-bytes': DEFAULT_MAX_PAYLOAD_BYTES,
    'log-max-bytes': DEFAULT_LOG_MAX_BYTES,
    'log-retention-files': DEFAULT_LOG_RETENTION_FILES,
    'throttle-ttl': DEFAULT_THROTTLE_TTL,
    'throttle-limit': DEFAULT_THROTTLE_LIMIT,
  };
}

function resolvePath(pathValue: string, baseDirectory: string): string {
  if (path.isAbsolute(pathValue)) {
    return pathValue;
  }
  return path.resolve(baseDirectory, pathValue);
}

function parseBooleanEnv(
  envValue: string | undefined,
  variableName: string,
): boolean | undefined {
  if (envValue === undefined || envValue.trim() === '') {
    return undefined;
  }
  const parsed = booleanSchema.safeParse(envValue);
  if (!parsed.success) {
    throw new Error(
      `${variableName} must be a boolean value (true/false, yes/no, 1/0)`,
    );
  }
  return parsed.data;
}

function parsePositiveIntegerEnv(
  envValue: string | undefined,
  variableName: string,
): number | undefined {
  if (envValue === undefined || envValue.trim() === '') {
    return undefined;
  }
  const parsed = Number.parseInt(envValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${variableName} must be a positive integer`);
  }
  return parsed;
}

@Injectable()
export default class Config implements IConfig {
  private configValues: ConfigValues = defaultConfigValues();

  constructor() {
    this.loadConfig();
  }

  loadConfig(configPath?: string): void {
    this.configValues = defaultConfigValues();
    const selectedConfigPath = configPath ?? process.env.LOGGER_CONFIG_PATH;
    if (selectedConfigPath !== undefined && selectedConfigPath.trim() !== '') {
      this.loadYamlConfig(selectedConfigPath);
    }
    this.applyEnvOverrides();
  }

  getHostname(): string {
    return this.configValues.hostname;
  }

  getPort(): number {
    return this.configValues.port;
  }

  getCorsAllowOrigin(): CorsAllowOrigin {
    return this.configValues['cors-allow-origin'];
  }

  getCorsAllowCredentials(): boolean {
    return this.configValues['cors-allow-credentials'];
  }

  getAuthToken(): string {
    return this.configValues['auth-token'];
  }

  getTls(): boolean {
    return this.configValues.tls;
  }

  getCertsDirectory(): string {
    return this.configValues.certs;
  }

  getLogFilePath(): string {
    return this.configValues['log-file-path'];
  }

  getMaxPayloadBytes(): number {
    return this.configValues['max-payload-bytes'];
  }

  getLogMaxBytes(): number {
    return this.configValues['log-max-bytes'];
  }

  getLogRetentionFiles(): number {
    return this.configValues['log-retention-files'];
  }

  getThrottleTtl(): number {
    return this.configValues['throttle-ttl'];
  }

  getThrottleLimit(): number {
    return this.configValues['throttle-limit'];
  }

  private loadYamlConfig(configPath: string): void {
    const resolvedConfigPath = resolveFile(configPath);
    const configDirectory = path.dirname(resolvedConfigPath);
    const configFile = readFileSync(resolvedConfigPath, 'utf8');
    const loadedYaml = yaml.load(configFile);
    const yamlValues =
      loadedYaml === undefined ? {} : loggerConfigSchema.parse(loadedYaml);

    if (yamlValues.hostname !== undefined) {
      this.configValues.hostname = yamlValues.hostname;
    }
    if (yamlValues.port !== undefined) {
      this.configValues.port = yamlValues.port;
    }
    if (yamlValues['cors-allow-origin'] !== undefined) {
      this.configValues['cors-allow-origin'] = yamlValues['cors-allow-origin'];
    }
    if (yamlValues['cors-allow-credentials'] !== undefined) {
      this.configValues['cors-allow-credentials'] =
        yamlValues['cors-allow-credentials'];
    }
    if (yamlValues['auth-token'] !== undefined) {
      this.configValues['auth-token'] = yamlValues['auth-token'];
    }
    if (yamlValues.tls !== undefined) {
      this.configValues.tls = yamlValues.tls;
    }
    if (yamlValues.certs !== undefined) {
      this.configValues.certs = resolvePath(yamlValues.certs, configDirectory);
    }
    if (yamlValues['log-file-path'] !== undefined) {
      this.configValues['log-file-path'] = resolvePath(
        yamlValues['log-file-path'],
        configDirectory,
      );
    }
    if (yamlValues['max-payload-bytes'] !== undefined) {
      this.configValues['max-payload-bytes'] = yamlValues['max-payload-bytes'];
    }
    if (yamlValues['log-max-bytes'] !== undefined) {
      this.configValues['log-max-bytes'] = yamlValues['log-max-bytes'];
    }
    if (yamlValues['log-retention-files'] !== undefined) {
      this.configValues['log-retention-files'] =
        yamlValues['log-retention-files'];
    }
    if (yamlValues['throttle-ttl'] !== undefined) {
      this.configValues['throttle-ttl'] = yamlValues['throttle-ttl'];
    }
    if (yamlValues['throttle-limit'] !== undefined) {
      this.configValues['throttle-limit'] = yamlValues['throttle-limit'];
    }
  }

  private applyEnvOverrides(): void {
    const hostname = process.env.LOGGER_HOSTNAME;
    if (hostname !== undefined && hostname.trim() !== '') {
      this.configValues.hostname = hostname.trim();
    }

    const port = parsePositiveIntegerEnv(
      process.env.LOGGER_PORT,
      'LOGGER_PORT',
    );
    if (port !== undefined) {
      this.configValues.port = port;
    }

    const corsAllowOrigin = process.env.LOGGER_CORS_ALLOW_ORIGIN;
    if (corsAllowOrigin !== undefined && corsAllowOrigin.trim() !== '') {
      this.configValues['cors-allow-origin'] = corsAllowOrigin.trim();
    }

    const corsAllowCredentials = parseBooleanEnv(
      process.env.LOGGER_CORS_ALLOW_CREDENTIALS,
      'LOGGER_CORS_ALLOW_CREDENTIALS',
    );
    if (corsAllowCredentials !== undefined) {
      this.configValues['cors-allow-credentials'] = corsAllowCredentials;
    }

    const authToken = process.env.LOGGER_AUTH_TOKEN;
    if (authToken !== undefined) {
      this.configValues['auth-token'] = authToken;
    }

    const tls = parseBooleanEnv(process.env.LOGGER_TLS, 'LOGGER_TLS');
    if (tls !== undefined) {
      this.configValues.tls = tls;
    }

    const certsDirectory = process.env.LOGGER_CERTS_DIR;
    if (certsDirectory !== undefined && certsDirectory.trim() !== '') {
      this.configValues.certs = resolvePath(certsDirectory, process.cwd());
    }

    const logFilePath = process.env.LOGGER_LOG_FILE_PATH;
    if (logFilePath !== undefined && logFilePath.trim() !== '') {
      this.configValues['log-file-path'] = resolvePath(
        logFilePath,
        process.cwd(),
      );
    }

    const maxPayloadBytes = parsePositiveIntegerEnv(
      process.env.LOGGER_MAX_PAYLOAD_BYTES,
      'LOGGER_MAX_PAYLOAD_BYTES',
    );
    if (maxPayloadBytes !== undefined) {
      this.configValues['max-payload-bytes'] = maxPayloadBytes;
    }

    const logMaxBytes = parsePositiveIntegerEnv(
      process.env.LOGGER_LOG_MAX_BYTES,
      'LOGGER_LOG_MAX_BYTES',
    );
    if (logMaxBytes !== undefined) {
      this.configValues['log-max-bytes'] = logMaxBytes;
    }

    const retentionFiles = parsePositiveIntegerEnv(
      process.env.LOGGER_LOG_RETENTION_FILES,
      'LOGGER_LOG_RETENTION_FILES',
    );
    if (retentionFiles !== undefined) {
      this.configValues['log-retention-files'] = retentionFiles;
    }

    const throttleTtl = parsePositiveIntegerEnv(
      process.env.LOGGER_THROTTLE_TTL,
      'LOGGER_THROTTLE_TTL',
    );
    if (throttleTtl !== undefined) {
      this.configValues['throttle-ttl'] = throttleTtl;
    }

    const throttleLimit = parsePositiveIntegerEnv(
      process.env.LOGGER_THROTTLE_LIMIT,
      'LOGGER_THROTTLE_LIMIT',
    );
    if (throttleLimit !== undefined) {
      this.configValues['throttle-limit'] = throttleLimit;
    }
  }
}
