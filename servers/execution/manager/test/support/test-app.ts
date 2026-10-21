import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import AppModule from 'src/app.module.js';
import Config from 'src/config/config.service.js';
import DigitalTwinsService from 'src/digital-twins/digital-twins.service.js';
import DtAutomationFacade from 'src/digital-twins/dt-automation/dt-automation-facade.js';
import type { IDigitalTwinsService } from 'src/digital-twins/interfaces/digital-twins.service.interface.js';
import { configureExecutionManagerApp } from 'src/main.js';
import { withGitlabEnv } from './gitlab-settings.js';

export async function createTestApp(
  service?: IDigitalTwinsService,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (service !== undefined) {
    // The service token resolves to DigitalTwinsService. The facade is
    // replaced too, so that dt-automation is never set up.
    builder = builder
      .overrideProvider(DigitalTwinsService)
      .useValue(service)
      .overrideProvider(DtAutomationFacade)
      .useValue({});
  }
  // Config reads the environment when the module is compiled.
  const moduleRef = await withGitlabEnv(() => builder.compile());
  const app = moduleRef.createNestApplication({ logger: false });
  configureExecutionManagerApp(app, app.get(Config));
  await app.init();
  return app;
}
