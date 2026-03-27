import { Module } from '@nestjs/common';
import AppController from './app.controller.js';
import LogsService from './logs/logs.service.js';
import Config from './config/config.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [LogsService, Config],
})
export default class AppModule {}
