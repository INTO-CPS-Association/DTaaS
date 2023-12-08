import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import AppModule from './app.module';
import CloudCMDService from './cloudcmd/cloudcmd.service';

type BootstrapOptions = {
  config?: string;
  fileserver?: string;
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

  if (options.fileserver) {
    const cloudcmd = app.get(CloudCMDService);
    cloudcmd.run(app, options.fileserver);
  }

  await app.listen(port);
}
