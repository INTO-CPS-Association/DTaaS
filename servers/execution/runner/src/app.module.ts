import { Module } from '@nestjs/common';
import AppController from './app.controller';
import LifeCycleManager from './lifecycleManager.service';
import Queue from './queue.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [LifeCycleManager, Queue],
})
export default class AppModule {}
