#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import AppModule from './app.module.js';
import Config from './config/config.service.js';

/*
The js file extension in import is a limitation of typescript.
See: https://stackoverflow.com/questions/62619058/appending-js-extension-on-relative-import-statements-during-typescript-compilat
     https://github.com/microsoft/TypeScript/issues/16577
*/

export function configureSignalsApp(
  app: NestExpressApplication,
  config: Config,
): void {
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: config.get('max-payload-bytes') });
  app.enableShutdownHooks();
}

// The bin entry of the package is a symlink, so the started path is
// resolved before it is compared with this module's own path.
export function isEntrypoint(entrypoint: string | undefined): boolean {
  if (entrypoint === undefined) return false;
  return import.meta.url === pathToFileURL(realpathSync(entrypoint)).href;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(Config);
  configureSignalsApp(app, config);
  await app.listen(config.get('port'), config.get('hostname'));
}

if (isEntrypoint(process.argv[1])) {
  await bootstrap();
}
