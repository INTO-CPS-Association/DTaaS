import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CONFIG_PATH_VARIABLE } from './cli.js';
import { IConfig } from './config.interface.js';
import { nonBlank, parsePositiveIntegerEnv, trimSlashes } from './parsers.js';

type ConfigValues = {
  hostname: string;
  port: number;
  'route-prefix': string;
};

const DEFAULT_HOSTNAME = '127.0.0.1';
const DEFAULT_PORT = 4004;
const DEFAULT_ROUTE_PREFIX = 'execution-manager';

const managerConfigSchema = z
  .object({
    hostname: z.string().trim().min(1).optional(),
    port: z.coerce.number().int().positive().optional(),
    // Empty is rejected like every other key; / serves the routes at the root.
    'route-prefix': z.string().trim().min(1).optional(),
  })
  .strict();

function defaultConfigValues(): ConfigValues {
  return {
    hostname: DEFAULT_HOSTNAME,
    port: DEFAULT_PORT,
    'route-prefix': DEFAULT_ROUTE_PREFIX,
  };
}

@Injectable()
export default class Config implements IConfig {
  private configValues: ConfigValues = defaultConfigValues();

  constructor() {
    this.loadConfig();
  }

  loadConfig(configPath?: string): void {
    this.configValues = defaultConfigValues();
    const selectedConfigPath = nonBlank(
      configPath ?? process.env[CONFIG_PATH_VARIABLE],
    );
    if (selectedConfigPath !== undefined) {
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

  getRoutePrefix(): string {
    return this.configValues['route-prefix'];
  }

  private loadYamlConfig(configPath: string): void {
    const resolvedConfigPath = path.resolve(configPath);
    const configFile = readFileSync(resolvedConfigPath, 'utf8');

    const documents = yaml.loadAll(configFile);
    if (documents.length > 1) {
      throw new Error(
        `${resolvedConfigPath} must contain a single YAML document`,
      );
    }
    const [loadedYaml] = documents;
    const yamlValues =
      loadedYaml === undefined ? {} : managerConfigSchema.parse(loadedYaml);
    this.configValues = { ...this.configValues, ...yamlValues };
    if (yamlValues['route-prefix'] !== undefined) {
      this.configValues['route-prefix'] = trimSlashes(
        yamlValues['route-prefix'],
      );
    }
  }

  private applyEnvOverrides(): void {
    const hostname = nonBlank(process.env.EXECUTION_MANAGER_HOSTNAME);
    if (hostname !== undefined) this.configValues.hostname = hostname;

    const port = parsePositiveIntegerEnv(
      process.env.EXECUTION_MANAGER_PORT,
      'EXECUTION_MANAGER_PORT',
    );
    if (port !== undefined) this.configValues.port = port;

    const routePrefix = nonBlank(process.env.EXECUTION_MANAGER_ROUTE_PREFIX);
    if (routePrefix !== undefined) {
      this.configValues['route-prefix'] = trimSlashes(routePrefix);
    }
  }
}
