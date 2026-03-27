#!/usr/bin/env -S NODE_OPTIONS="--es-module-specifier-resolution=node  --experimental-modules --experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node

import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import AppModule from './app.module.js';
import Config from './config/config.service.js';

/*
The js file extension in import is a limitation of typescript.
See: https://stackoverflow.com/questions/62619058/appending-js-extension-on-relative-import-statements-during-typescript-compilat
     https://github.com/microsoft/TypeScript/issues/16577
*/

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<Config>(Config);
  app.use(json({ limit: `${config.getMaxPayloadBytes()}b` }));
  await app.listen(config.getPort());
}

bootstrap();
