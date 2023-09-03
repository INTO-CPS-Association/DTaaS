import { NestFactory } from '@nestjs/core';
import AppModule from './app.module.js';

/*
The js file extension in import is a limitation of typescript.
See: https://stackoverflow.com/questions/62619058/appending-js-extension-on-relative-import-statements-during-typescript-compilat
     https://github.com/microsoft/TypeScript/issues/16577
*/

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
