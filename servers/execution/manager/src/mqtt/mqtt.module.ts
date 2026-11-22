import { Module } from '@nestjs/common';
import mqtt from 'mqtt';
import ConfigModule from '../config/config.module.js';
import Config from '../config/config.service.js';
import DigitalTwinsModule from '../digital-twins/digital-twins.module.js';
import MqttService, { MQTT_CONNECT } from './mqtt.service.js';
import { MQTT_SETTINGS, resolveMqttSettings } from './settings.js';

@Module({
  imports: [ConfigModule, DigitalTwinsModule],
  providers: [
    {
      provide: MQTT_SETTINGS,
      inject: [Config],
      useFactory: (config: Config) =>
        resolveMqttSettings(config.getMqtt(), config.getGitlab().username),
    },
    { provide: MQTT_CONNECT, useValue: mqtt.connect },
    MqttService,
  ],
})
export default class MqttModule {}
