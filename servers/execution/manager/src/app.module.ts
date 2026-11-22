import { Module } from '@nestjs/common';
import AppController from './app.controller.js';
import ConfigModule from './config/config.module.js';
import DigitalTwinsModule from './digital-twins/digital-twins.module.js';
import MqttModule from './mqtt/mqtt.module.js';

@Module({
  imports: [ConfigModule, DigitalTwinsModule, MqttModule],
  controllers: [AppController],
})
export default class AppModule {}
