import { Module } from '@nestjs/common';
import AppController from './app.controller.js';
import ConfigModule from './config/config.module.js';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
})
export default class AppModule {}
