import { Module } from '@nestjs/common';
import AppController from './app.controller';
import AppService from './app.service';
import LifeCycleManager from './lifecycleManager.service';
import Queue from './queue.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, LifeCycleManager, Queue],
})
export default class AppModule {}
