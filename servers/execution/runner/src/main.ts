#!/usr/bin/env -S NODE_OPTIONS="--es-module-specifier-resolution=node  --experimental-modules --experimental-specifier-resolution=node" NODE_NO_WARNINGS=1 node

import { NestFactory } from '@nestjs/core';
import Keyv from 'keyv';
import AppModule from './app.module.js';
import Config from './config/configuration.service.js';
import CLI, { createCommand } from './config/commander.js';

/*
The js file extension in import is a limitation of typescript.
See: https://stackoverflow.com/questions/62619058/appending-js-extension-on-relative-import-statements-during-typescript-compilat
     https://github.com/microsoft/TypeScript/issues/16577
*/

const PROGRAM_NAME = 'runner';
const [program, CLIOptions] = createCommand(PROGRAM_NAME);
await CLI(program, CLIOptions); // function fills the CLIOptions

async function bootstrap(options: Keyv) {
  const app = await NestFactory.create(AppModule);
  const config = app.get<Config>(Config);
  await config.loadConfig(options);
  await app.listen(config.getPort());
}
bootstrap(CLIOptions);
