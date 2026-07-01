import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IConfig } from './config.interface.js';
import resolveFile from './util.js';

type ConfigValues = {
  hostname: string;
  port: number;
  'cors-allow-origin': string;
  jwt: string;
  certs: string;
  tls: boolean;
  'log-file-path': string;
  'max-payload-bytes': number;
};

const DEFAULT_HOSTNAME = '0.0.0.0';
const DEFAULT_PORT = 4003;
const DEFAULT_JWT = '';
const DEFAULT_CERTS_DIR = 'certs';
const DEFAULT_LOG_FILE = 'logs/workflow-logs.jsonl';
const DEFAULT_MAX_PAYLOAD_BYTES = 64 * 1024;

function defaultCorsAllowOrigin(port: number): string {
  return `${DEFAULT_HOSTNAME}:${port}`;
}

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
    'cors-allow-origin': z.string().trim().min(1).optional(),
    jwt: z.string().optional(),
    certs: z.string().trim().min(1).optional(),
    tls: booleanSchema.optional(),
    'log-file-path': z.string().trim().min(1).optional(),
    'max-payload-bytes': z.coerce.number().int().positive().optional(),
  })
  .strict();

function defaultConfigValues(): ConfigValues {
  return {
    hostname: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
    'cors-allow-origin': defaultCorsAllowOrigin(DEFAULT_PORT),
    jwt: DEFAULT_JWT,
    certs: path.resolve(process.cwd(), DEFAULT_CERTS_DIR),
    tls: false,
    'log-file-path': path.resolve(process.cwd(), DEFAULT_LOG_FILE),
    'max-payload-bytes': DEFAULT_MAX_PAYLOAD_BYTES,
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

  getCorsAllowOrigin(): string {
    return this.configValues['cors-allow-origin'];
  }

  getJwt(): string {
    return this.configValues.jwt;
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
      const previousPort = this.configValues.port;
      this.configValues.port = yamlValues.port;
      if (
        this.configValues['cors-allow-origin'] ===
        defaultCorsAllowOrigin(previousPort)
      ) {
        this.configValues['cors-allow-origin'] = defaultCorsAllowOrigin(
          yamlValues.port,
        );
      }
    }
    if (yamlValues['cors-allow-origin'] !== undefined) {
      this.configValues['cors-allow-origin'] = yamlValues['cors-allow-origin'];
    }
    if (yamlValues.jwt !== undefined) {
      this.configValues.jwt = yamlValues.jwt;
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
      const previousPort = this.configValues.port;
      this.configValues.port = port;
      if (
        this.configValues['cors-allow-origin'] ===
        defaultCorsAllowOrigin(previousPort)
      ) {
        this.configValues['cors-allow-origin'] = defaultCorsAllowOrigin(port);
      }
    }

    const corsAllowOrigin = process.env.LOGGER_CORS_ALLOW_ORIGIN;
    if (corsAllowOrigin !== undefined && corsAllowOrigin.trim() !== '') {
      this.configValues['cors-allow-origin'] = corsAllowOrigin.trim();
    }

    const jwt = process.env.LOGGER_JWT;
    if (jwt !== undefined) {
      this.configValues.jwt = jwt;
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
  }
}
