import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import SignalsAuthGuard from './auth/auth.guard.js';
import GitLabClient from './auth/gitlab.client.js';
import IdentityService from './auth/identity.service.js';
import AccessService from './authz/access.service.js';
import GitLabTwinPolicy from './authz/gitlab-twin.policy.js';
import { ACCESS_POLICY } from './authz/policy.js';
import TwinReader from './authz/twin-reader.js';
import AmqpBroker from './broker/amqp.broker.js';
import { SIGNAL_BROKER } from './broker/broker.js';
import Config from './config/config.service.js';
import ConfigModule from './config/config.module.js';
import HistoryService from './history/history.service.js';
import InfluxClient from './history/influx.client.js';
import SignalsController from './signals.controller.js';
import SocketAddressThrottlerGuard from './socket-address-throttler.guard.js';
import StreamService from './stream/stream.service.js';
import StreamSlots from './stream/stream-slots.js';

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
  providers: [
    GitLabClient,
    IdentityService,
    SignalsAuthGuard,
    TwinReader,
    { provide: ACCESS_POLICY, useClass: GitLabTwinPolicy },
    AccessService,
    {
      provide: SIGNAL_BROKER,
      useFactory: (config: Config) => new AmqpBroker(config),
      inject: [Config],
    },
    StreamSlots,
    StreamService,
    InfluxClient,
    HistoryService,
    { provide: APP_GUARD, useClass: SocketAddressThrottlerGuard },
  ],
})
export default class AppModule {}
