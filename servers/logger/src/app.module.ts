import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import AppController from './app.controller.js';
import LogEventValidationPipe from './log-event-validation.pipe.js';
import LoggerAuthGuard from './logger-auth.guard.js';
import Config from './config/config.service.js';
import LogsModule from './logs/logs.module.js';
import SocketAddressThrottlerGuard from './socket-address-throttler.guard.js';

@Module({
  imports: [
    LogsModule,
    ThrottlerModule.forRootAsync({
      imports: [LogsModule],
      inject: [Config],
      useFactory: (config: Config) => ({
        throttlers: [
          {
            ttl: config.getThrottleTtl(),
            limit: config.getThrottleLimit(),
          },
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    LogEventValidationPipe,
    LoggerAuthGuard,
    { provide: APP_GUARD, useClass: SocketAddressThrottlerGuard },
  ],
})
export default class AppModule {}
