#!/usr/bin/env node

import { Logger, NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { pathToFileURL } from 'node:url';
import AppModule from './app.module.js';
import Config from './config/config.service.js';
import resolveConfigPath from './config/cli.js';
import { buildCorsOptions } from './config/cors.js';

/*
The js file extension in import is a limitation of typescript.
See: https://stackoverflow.com/questions/62619058/appending-js-extension-on-relative-import-statements-during-typescript-compilat
     https://github.com/microsoft/TypeScript/issues/16577
*/

type SignalsAppOptions = Omit<NestApplicationOptions, 'bodyParser'>;

export function configureSignalsApp(
  app: NestExpressApplication,
  config: Config,
): void {
  const cors = buildCorsOptions(
    config.get('cors-allow-origin'),
    config.get('cors-allow-credentials'),
  );
  // Behind Traefik the client is on the same origin, so CORS stays off
  // unless an origin is configured.
  if (cors.origin !== false) app.enableCors(cors);
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: config.get('max-payload-bytes') });
  app.enableShutdownHooks();
}

export async function createSignalsApp(
  config: Config,
  options: SignalsAppOptions = {},
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...options,
    bodyParser: false,
  });
  configureSignalsApp(app, config);
  return app;
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
  if (configPath !== undefined) process.env.SIGNALS_CONFIG_PATH = configPath;
  const config = new Config();
  if (config.get('gitlab-url') === '') {
    Logger.warn(
      'gitlab-url is not set: every request with a token is refused',
      'Signals',
    );
  }
  const app = await createSignalsApp(config);
  await app.listen(config.get('port'), config.get('hostname'));
}

if (isEntrypoint()) {
  await bootstrap();
}
