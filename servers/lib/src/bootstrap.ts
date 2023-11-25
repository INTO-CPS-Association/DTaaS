import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cloudcmd = require('cloudcmd');
import * as dotenv from 'dotenv';
import AppModule from './app.module';

type BootstrapOptions = {
  config?: string;
  runHelp?: CallableFunction;
};

export default async function bootstrap(options?: BootstrapOptions) {
  const configFile = dotenv.config({
    path: options?.config ?? '.env',
    override: true,
  });
  if (configFile.error) {
    // eslint-disable-next-line no-console
    console.error(configFile.error);
    if (options.runHelp) {
      options.runHelp();
    } else {
      process.exit(1);
    }
  }

  const config = {
    name: 'cloudcmd',
  };

  const { createConfigManager, configPath } = cloudcmd;

  const filePicker = {
    data: {
      FilePicker: {
        key: 'key',
      },
    },
  };

  const modules = {
    filePicker,
  };

  const configManager = createConfigManager(configPath);

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  app.use('/cmd', cloudcmd({ configManager, modules, config }));
  await app.listen(port);
}
