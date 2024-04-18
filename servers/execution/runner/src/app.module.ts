import { Module } from '@nestjs/common';
import RunnerFactory from './runner-factory.service.js';
import AppController from './app.controller.js';
import ExecaManager from './execa-manager.service.js';
import Queue from './queue.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [ExecaManager, Queue, RunnerFactory],
})
export default class AppModule {}
