import { Global, Module } from '@nestjs/common';
import Config from './config.service.js';

// Global, so the throttler's async factory and every service share one Config.
@Global()
@Module({ providers: [Config], exports: [Config] })
export default class ConfigModule {}
