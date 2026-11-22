import { Module } from '@nestjs/common';
import Config from './config.service.js';

@Module({
  providers: [Config],
  exports: [Config],
})
export default class ConfigModule {}
