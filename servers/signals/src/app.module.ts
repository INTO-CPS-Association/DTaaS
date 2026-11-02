import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import Config from './config/config.service.js';
import ConfigModule from './config/config.module.js';
import SignalsController from './signals.controller.js';
import SocketAddressThrottlerGuard from './socket-address-throttler.guard.js';

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRootAsync({
      useFactory: (config: Config) => ({
        throttlers: [
          {
            ttl: config.get('throttle-ttl'),
            limit: config.get('throttle-limit'),
          },
        ],
      }),
      inject: [Config],
    }),
  ],
  controllers: [SignalsController],
  providers: [{ provide: APP_GUARD, useClass: SocketAddressThrottlerGuard }],
})
export default class AppModule {}
