import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import AppModule from 'src/app.module.js';
import Config from 'src/config/config.service.js';
import { configureExecutionManagerApp } from 'src/main.js';

export async function createTestApp(): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureExecutionManagerApp(app, app.get(Config));
  await app.init();
  return app;
}
