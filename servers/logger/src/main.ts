#!/usr/bin/env -S NODE_OPTIONS="--es-module-specifier-resolution=node  --experimental-modules --experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node

import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { readFile } from 'node:fs/promises';
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

async function bootstrap() {
  const configPath = resolveConfigPath(process.argv);
  if (configPath !== undefined) {
    process.env.LOGGER_CONFIG_PATH = configPath;
  }

  const configContext = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const startupConfig = configContext.get<Config>(Config);
  startupConfig.loadConfig(configPath);

  const httpsOptions = startupConfig.getTls()
    ? await (async () => {
        const certPaths = await ensureCertificates(
          startupConfig.getCertsDirectory(),
        );
        return {
          cert: await readFile(certPaths.certFile),
          key: await readFile(certPaths.keyFile),
        };
      })()
    : undefined;
  await configContext.close();

  const app = await NestFactory.create(AppModule, { httpsOptions });
  const config = app.get<Config>(Config);
  app.enableCors(
    buildCorsOptions(config.getCorsAllowOrigin(), config.getPort()),
  );
  app.use(json({ limit: `${config.getMaxPayloadBytes()}b` }));
  await app.listen(config.getPort(), config.getHostname());
}

bootstrap();
