import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import RunnerFactoryService from './runner-factory.service.js';
import AppController from './app.controller.js';
import ExecaManager from './execa-manager.service.js';
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
  providers: [ExecaManager, Queue, RunnerFactoryService],
})
export default class AppModule {}
