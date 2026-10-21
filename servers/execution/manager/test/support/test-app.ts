import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import AppModule from 'src/app.module.js';
import Config from 'src/config/config.service.js';
import DigitalTwinsService from 'src/digital-twins/digital-twins.service.js';
import DtAutomationFacade from 'src/digital-twins/dt-automation/dt-automation-facade.js';
import type { IDigitalTwinsService } from 'src/digital-twins/interfaces/digital-twins.service.interface.js';
import { configureExecutionManagerApp } from 'src/main.js';
import { MQTT_CONNECT } from 'src/mqtt/mqtt.service.js';
import { MQTT_SETTINGS, type ResolvedMqttSettings } from 'src/mqtt/settings.js';
import { withGitlabEnv } from './gitlab-settings.js';
import { neverConnect } from './mqtt.js';

export async function createTestApp(
  service?: IDigitalTwinsService,
  mqtt?: ResolvedMqttSettings,
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
  builder =
    mqtt === undefined
      ? builder.overrideProvider(MQTT_CONNECT).useValue(neverConnect)
      : builder.overrideProvider(MQTT_SETTINGS).useValue(mqtt);
  // Config reads the environment when the module is compiled.
  const moduleRef = await withGitlabEnv(() => builder.compile());
  const app = moduleRef.createNestApplication({ logger: false });
  configureExecutionManagerApp(app, app.get(Config));
  await app.init();
  return app;
}
