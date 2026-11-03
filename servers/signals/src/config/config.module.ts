import { Global, Module } from '@nestjs/common';
import Config from './config.service.js';

// Global, so every module and service share one Config.
@Global()
@Module({ providers: [Config], exports: [Config] })
export default class ConfigModule {}
