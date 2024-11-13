import { NestFactory } from '@nestjs/core';
import AppModule from './app.module.js';
import cloudCMD from './cloudcmd/cloudcmd.js';
import Config from './config/config.service.js';
import { Logger } from '@nestjs/common';

type BootstrapOptions = {
  config?: string;
  httpServer?: string;
  runHelp?: CallableFunction;
};

export default async function bootstrap(options?: BootstrapOptions) {
  const logger = new Logger(bootstrap.name);

  if (options.config === undefined) {
    this.logger.error('No configuration file was provided');
    if (options.runHelp) {
      options.runHelp();
    } else {
      process.exit(1);
    }
  }
  process.env.LIBMS_CONFIG_PATH = options.config;

  const app = await NestFactory.create(AppModule);
  const configService = app.get(Config);
  const port = configService.getPort();
  const localPath = configService.getLocalPath();
  const mode = configService.getMode();

  logger.log(
    `\x1b[32mStarting libms in \x1b[33m${mode} \x1b[32mmode, serving files from \x1b[34m${localPath} \x1b[32mon port \x1b[35m${port}\x1b[0m`,
  );

  if (options.httpServer) {
    cloudCMD(app, options.httpServer, configService.getLocalPath());
  }

  await app.listen(port);
}
