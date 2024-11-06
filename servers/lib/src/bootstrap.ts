import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import AppModule from './app.module.js';
import cloudCMD from './cloudcmd/cloudcmd.js';

type BootstrapOptions = {
  config?: string;
  httpServer?: string;
  runHelp?: CallableFunction;
};

export default async function bootstrap(options?: BootstrapOptions) {
  const configFile = dotenv.config({
    path: options?.config ?? '.env',
    override: true,
  });
  if (configFile.error && process.env.LOCAL_PATH === undefined) {
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
  const localPath = configService.get<string>('LOCAL_PATH');
  const mode = configService.get<string>('MODE');

  console.log(`\x1b[32mStarting libms in \x1b[33m${mode} \x1b[32mmode, serving files from \x1b[34m${localPath} \x1b[32mon port \x1b[35m${port}\x1b[0m`);

  if (options.httpServer) {
    cloudCMD(app, options.httpServer, configService.get<string>('LOCAL_PATH'));
  }

  await app.listen(port);
}
