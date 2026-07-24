#!/usr/bin/env -S NODE_OPTIONS="--es-module-specifier-resolution=node --experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node

import { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import AppModule from './app.module.js';
import Config from './config/config.service.js';
import resolveConfigPath from './config/cli.js';
import { ensureCertificates } from './config/certificates.js';
import { buildCorsOptions } from './config/cors.js';

/*
The js file extension in import is a limitation of typescript.
See: https://stackoverflow.com/questions/62619058/appending-js-extension-on-relative-import-statements-during-typescript-compilat
     https://github.com/microsoft/TypeScript/issues/16577
*/

type BodyParserApp = {
  use: (middleware: ReturnType<typeof json>) => void;
};

type LoggerAppOptions = Omit<NestApplicationOptions, 'bodyParser'>;

export function registerBodyParser(app: BodyParserApp, config: Config): void {
  app.use(
    json({
      limit: `${config.getMaxPayloadBytes()}b`,
      type: ['application/json', 'text/plain'],
    }),
  );
}

export function configureLoggerApp(
  app: INestApplication,
  config: Config,
): void {
  app.enableCors(
    buildCorsOptions(
      config.getCorsAllowOrigin(),
      config.getCorsAllowCredentials(),
    ),
  );
  registerBodyParser(app, config);
}

export async function createLoggerApp(
  config: Config,
  options: LoggerAppOptions = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    ...options,
    bodyParser: false,
  });
  configureLoggerApp(app, config);
  return app;
}

async function buildHttpsOptions(config: Config) {
  if (!config.getTls()) return undefined;
  const certPaths = await ensureCertificates(config.getCertsDirectory());
  return {
    cert: await readFile(certPaths.certFile),
    key: await readFile(certPaths.keyFile),
  };
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];
  return (
    entrypoint !== undefined &&
    import.meta.url === pathToFileURL(entrypoint).href
  );
}

async function bootstrap() {
  const configPath = resolveConfigPath(process.argv);
  if (configPath !== undefined) {
    process.env.LOGGER_CONFIG_PATH = configPath;
  }

  const startupConfig = new Config();
  startupConfig.loadConfig(configPath);
  const httpsOptions = await buildHttpsOptions(startupConfig);
  const app = await createLoggerApp(startupConfig, {
    httpsOptions,
  });
  await app.listen(startupConfig.getPort(), startupConfig.getHostname());
}

if (isEntrypoint()) {
  await bootstrap();
}
