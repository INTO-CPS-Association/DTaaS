import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import AppModule from './app.module';
import runCloudCmd from './cloudcmd';

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

  if (options.fileserver) {
    runCloudCmd(app);
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  await app.listen(port);
}
