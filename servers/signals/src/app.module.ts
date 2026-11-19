import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import SignalsAuthGuard from './auth/auth.guard.js';
import GitLabClient from './auth/gitlab.client.js';
import IdentityService from './auth/identity.service.js';
import OidcVerifier from './auth/oidc.verifier.js';
import AccessService from './authz/access.service.js';
import GitLabTwinPolicy from './authz/gitlab-twin.policy.js';
import Owners from './authz/owners.js';
import { ACCESS_POLICY } from './authz/policy.js';
import TwinReader from './authz/twin-reader.js';
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
  providers: [
    GitLabClient,
    OidcVerifier,
    IdentityService,
    SignalsAuthGuard,
    TwinReader,
    Owners,
    { provide: ACCESS_POLICY, useClass: GitLabTwinPolicy },
    AccessService,
    { provide: APP_GUARD, useClass: SocketAddressThrottlerGuard },
  ],
})
export default class AppModule {}
