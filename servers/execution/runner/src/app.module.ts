import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import AppController from './app.controller.js';
import LifeCycleManager from './lifecycleManager.service.js';
import Queue from './queue.service.js';
import configuration from './config/configuration.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      load: [configuration],
    }),
  ],
  controllers: [AppController],
  providers: [LifeCycleManager, Queue],
})
export default class AppModule {}
