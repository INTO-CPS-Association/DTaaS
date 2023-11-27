import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cloudcmd = require('cloudcmd');
import * as dotenv from 'dotenv';
import { Server } from 'socket.io';
import AppModule from './app.module';
import createConfig from './cloudcmd.config';

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

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  const fileServerPath = configService.get<string>('FILE_SERVER_PATH');

  const server = app.getHttpServer();

  const socket = new Server(server, {
    path: `${fileServerPath}/socket.io/`,
  });

  app.use(
    fileServerPath,
    cloudcmd({
      config: createConfig(),
      socket,
    }),
  );
  await app.listen(port);
}
