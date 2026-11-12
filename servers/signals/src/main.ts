#!/usr/bin/env node

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import AppModule from './app.module.js';
import Config from './config/config.service.js';
import { buildCorsOptions } from './config/cors.js';
import GitLabClient from './auth/gitlab.client.js';
import startupWarnings, { startupErrors } from './config/startup-warnings.js';
import ownTokenWarnings from './config/token-scope-check.js';

/*
The js file extension in import is a limitation of typescript.
See: https://stackoverflow.com/questions/62619058/appending-js-extension-on-relative-import-statements-during-typescript-compilat
     https://github.com/microsoft/TypeScript/issues/16577
*/

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
  // The gateway answers JSON and event streams only, so a browser is told
  // never to guess another type, also when no proxy adds the header.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  // Behind Traefik every request comes from the proxy. Naming it here lets
  // the rate limit count each client, from the address the proxy appended.
  const proxies = config.get('trusted-proxies');
  if (proxies.length > 0) app.set('trust proxy', proxies);
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
  // Settings the gateway refuses stop it before anything is started.
  const errors = startupErrors(new Config());
  if (errors.length > 0) throw new Error(errors.join('\n'));
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(Config);
  startupWarnings(config).forEach((warning) => Logger.warn(warning, 'Signals'));
  configureSignalsApp(app, config);
  await app.listen(config.get('port'), config.get('hostname'));
  // Checked after listen, so a slow GitLab does not delay the start.
  const tokenWarnings = await ownTokenWarnings(config, app.get(GitLabClient));
  tokenWarnings.forEach((warning) => Logger.warn(warning, 'Signals'));
}

if (isEntrypoint(process.argv[1])) {
  await bootstrap();
}
