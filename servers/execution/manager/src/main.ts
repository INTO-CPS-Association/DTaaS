#!/usr/bin/env -S NODE_OPTIONS="--experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node

import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { pathToFileURL } from 'node:url';
import AppModule from './app.module.js';
import Config from './config/config.service.js';
import resolveConfigPath, { CONFIG_PATH_VARIABLE } from './config/cli.js';

export function configureExecutionManagerApp(
  app: INestApplication,
  config: Config,
): void {
  const routePrefix = config.getRoutePrefix();
  if (routePrefix !== '') app.setGlobalPrefix(routePrefix);
}

export async function createExecutionManagerApp(
  config: Config,
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureExecutionManagerApp(app, config);
  return app;
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return (
    entrypoint !== undefined &&
    import.meta.url === pathToFileURL(entrypoint).href
  );
}

async function bootstrap(): Promise<void> {
  const configPath = resolveConfigPath(process.argv);
  if (configPath !== undefined) {
    process.env[CONFIG_PATH_VARIABLE] = configPath;
  }

  const startupConfig = new Config();
  const app = await createExecutionManagerApp(startupConfig);
  await app.listen(startupConfig.getPort(), startupConfig.getHostname());
}

if (isEntrypoint()) {
  await bootstrap();
}
