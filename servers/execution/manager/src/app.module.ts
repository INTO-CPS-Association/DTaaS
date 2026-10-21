import { Module } from '@nestjs/common';
import AppController from './app.controller.js';
import ConfigModule from './config/config.module.js';
import DigitalTwinsModule from './digital-twins/digital-twins.module.js';

@Module({
  imports: [ConfigModule, DigitalTwinsModule],
  controllers: [AppController],
})
export default class AppModule {}
