import { Module } from '@nestjs/common';
import ConfigModule from './config/config.module.js';
import SignalsController from './signals.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [SignalsController],
})
export default class AppModule {}
