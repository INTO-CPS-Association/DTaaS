import { Module } from '@nestjs/common';
import Config from '../config/config.service.js';
import LogsService from './logs.service.js';

@Module({
  providers: [Config, LogsService],
  exports: [Config, LogsService],
})
export default class LogsModule {}
